import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  Subject,
  tap,
  catchError,
  throwError,
  firstValueFrom,
  fromEvent,
  merge,
  switchMap,
} from 'rxjs';
import { throttleTime, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';
import {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ApiResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private refreshTokenTimeout?: any;

  // ── Idle Logout ───────────────────────────────────────────
  // private readonly IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (testing)
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes production
  private idleTimeout?: any;
  private stopIdle$ = new Subject<void>(); // FIX 3: recreated on every stopIdleTimer()

  constructor(
    private http: HttpClient,
    private router: Router,
    private logger: LoggerService,
    private ngZone: NgZone,
  ) {}

  // ============================================================
  // Idle Logout Timer
  // ============================================================
  private startIdleTimer(): void {
    this.stopIdleTimer(); // also recreates stopIdle$ (FIX 3)

    this.ngZone.runOutsideAngular(() => {
      // FIX 1: single shared resetTimer fn — initial timer and activity both
      // clear/restart the SAME timeout handle, so they can never race.
      const resetTimer = () => {
        clearTimeout(this.idleTimeout);
        this.idleTimeout = setTimeout(() => this.onIdle(), this.IDLE_TIMEOUT_MS);
      };

      const activity$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'mousedown'),
        fromEvent(window, 'touchstart'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'click'),
      ).pipe(
        throttleTime(500),
        takeUntil(this.stopIdle$),
      );

      activity$.subscribe(() => resetTimer());
      resetTimer(); // kick off the initial countdown
    });
  }

  private onIdle(): void {
    this.ngZone.run(() => {
      this.logger.info('Session expired due to inactivity');
      this.stopIdleTimer();
      this.logout(this.router.url); // FIX: pass current URL to restore after re-login
    });
  }

  private stopIdleTimer(): void {
    clearTimeout(this.idleTimeout);
    this.stopIdle$.next();
    this.stopIdle$.complete();           // FIX 3: close the exhausted subject
    this.stopIdle$ = new Subject<void>(); // FIX 3: fresh subject for the next session
  }

  // ============================================================
  // Initialize - Called by APP_INITIALIZER
  // ============================================================
  async initialize(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/me`, {
          withCredentials: true,
        }),
      );

      if (response.success && response.data) {
        this.logger.info('Session restored');
        this.currentUserSubject.next({
          requirePasswordChange: false,
          accessToken: '',
          refreshToken: '',
          ...response.data,
        });
        this.startRefreshTokenTimer(response.data.accessTokenExpiresAt);
        this.startIdleTimer();
      }
    } catch (error: any) {
      this.logger.info('No active session');
      this.currentUserSubject.next(null);
    }
  }

  // ============================================================
  // Login
  // ============================================================
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.apiUrl}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.logger.info('Login successful');
            this.currentUserSubject.next(response.data);
            this.startRefreshTokenTimer(response.data.accessTokenExpiresAt);
            this.startIdleTimer();
          }
        }),
        catchError((error) => {
          this.logger.error('Login failed', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // Refresh Token
  // ============================================================
  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.apiUrl}/auth/refresh-token`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.logger.info('Token refreshed');
            this.currentUserSubject.next(response.data);
            this.startRefreshTokenTimer(response.data.accessTokenExpiresAt);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Token refresh failed', error);
          this.logoutLocal();
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // Auto-Refresh Timer
  // ============================================================
  private startRefreshTokenTimer(expiresAt?: string | Date) {
    this.stopRefreshTokenTimer();

    let msUntilRefresh = 55 * 60 * 1000; // fallback: 55 min

    if (expiresAt) {
      const expiryMs = new Date(expiresAt).getTime();
      const nowMs = Date.now();
      // Refresh 60 seconds before expiry; clamp to at least 5 seconds
      msUntilRefresh = Math.max(expiryMs - nowMs - 60_000, 5_000);
    }

    this.logger.info(`Token refresh scheduled in ${Math.round(msUntilRefresh / 1000)}s`);

    this.refreshTokenTimeout = setTimeout(() => {
      this.logger.info('Auto-refreshing token...');
      this.refreshToken().subscribe({ error: () => {} }); // logoutLocal called in catchError
    }, msUntilRefresh);
  }

  private stopRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  // ============================================================
  // Logout
  // ============================================================
  logout(returnUrl?: string): void {
    this.logger.info('Logging out...');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();

    // FIX 2: clear state BEFORE the HTTP call so LoginComponent never
    // sees a stale user if Angular renders it while the request is in flight.
    this.currentUserSubject.next(null);

    // Save current URL so user can resume work after re-login
    if (returnUrl && returnUrl !== '/auth/login') {
      sessionStorage.setItem('postLoginRedirect', returnUrl);
    }

    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login']),
      });
  }

  // Clear local auth state and navigate to login — no API call.
  // Used by the interceptor on refresh failure to avoid double logout.
  logoutLocal(): void {
    this.logger.info('Clearing local session...');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ============================================================
  // Password Management
  // ============================================================
  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      request,
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/auth/reset-password`,
      request,
    );
  }

  changePassword(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/auth/change-password`,
      data,
      { withCredentials: true },
    );
  }

  // ============================================================
  // Get Current User
  // ============================================================
  getCurrentUser(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/me`, {
      withCredentials: true,
    });
  }

  // ============================================================
  // Helper Methods
  // ============================================================
  isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  get currentUserValue(): LoginResponse | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: LoginResponse): void {
    this.currentUserSubject.next(user);
  }

  getUserRole(): string | null {
    return this.currentUserValue?.role || null;
  }

  isSuperAdmin(): boolean {
    return this.getUserRole() === 'SuperAdmin';
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'Admin' || role === 'SuperAdmin';
  }

  isTeacher(): boolean {
    return this.getUserRole() === 'Teacher';
  }

  isStaff(): boolean {
    return this.getUserRole() === 'NonTeachingStaff';
  }

  isStudent(): boolean {
    return this.getUserRole() === 'Student';
  }

  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  // SuperAdmin bypasses all role checks
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    if (userRole === 'SuperAdmin') return true;
    return userRole ? roles.includes(userRole) : false;
  }

  getUserId(): string | null {
    return this.currentUserValue?.userId?.toString() || null;
  }

  getSchoolId(): string | null {
    return this.currentUserValue?.schoolId?.toString() || null;
  }

  getUserEmail(): string | null {
    return this.currentUserValue?.email || null;
  }

  getUserName(): string | null {
    const email = this.getUserEmail();
    return email ? email.split('@')[0] : null;
  }

  getUserDisplayName(): string | null {
    return this.getUserEmail();
  }

  getSchoolName(): string | null {
    return this.currentUserValue?.schoolName || null;
  }
}