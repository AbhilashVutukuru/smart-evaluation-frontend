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
  private stopIdle$ = new Subject<void>();

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
    this.stopIdleTimer(); // also recreates stopIdle$

    this.ngZone.runOutsideAngular(() => {
      // Single shared resetTimer — initial countdown and activity both use the
      // same handle so they can never race each other.
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
      this.logout(this.router.url); // pass current URL so user can resume after re-login
    });
  }

  private stopIdleTimer(): void {
    clearTimeout(this.idleTimeout);
    this.stopIdle$.next();
    this.stopIdle$.complete();            // close the exhausted subject
    this.stopIdle$ = new Subject<void>(); // fresh subject for the next session
  }

  // ============================================================
  // Initialize — called by APP_INITIALIZER
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
    } catch {
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
            // FIX: merge refresh data with existing user — the refresh endpoint
            // only returns token fields, not role/name/schoolName etc.
            // Replacing the whole object loses the role → roleGuard fails → /unauthorized
            const existing = this.currentUserSubject.value;
            this.currentUserSubject.next({ ...existing, ...response.data });
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
  private startRefreshTokenTimer(expiresAt?: string | Date): void {
    this.stopRefreshTokenTimer();

    // Refresh 60 s before expiry. Falls back to 55 min if no expiry provided.
    let msUntilRefresh = 55 * 60 * 1000;

    if (expiresAt) {
      const expiryMs = new Date(expiresAt).getTime();
      msUntilRefresh = Math.max(expiryMs - Date.now() - 60_000, 5_000);
    }

    this.logger.info(`Token refresh scheduled in ${Math.round(msUntilRefresh / 1000)}s`);

    this.refreshTokenTimeout = setTimeout(() => {
      this.logger.info('Auto-refreshing token...');
      this.refreshToken().subscribe({ error: () => {} }); // logoutLocal called in catchError
    }, msUntilRefresh);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
  }

  // ============================================================
  // Logout
  // ============================================================
  logout(returnUrl?: string): void {
    this.logger.info('Logging out...');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();

    // Clear state BEFORE the HTTP call — LoginComponent must never see a
    // stale user if Angular renders it while the logout request is in flight.
    this.currentUserSubject.next(null);

    // Persist the current URL so the user can resume their work after re-login
    if (returnUrl && returnUrl !== '/auth/login') {
      sessionStorage.setItem('postLoginRedirect', returnUrl);
    }

    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => this.router.navigate(['/auth/login']),
        error:    () => this.router.navigate(['/auth/login']),
      });
  }

  // Clear local state only — no API call.
  // Used by the interceptor on refresh failure to avoid a double logout.
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
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/reset-password`, request);
  }

  changePassword(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/auth/change-password`, data, { withCredentials: true });
  }

  // ============================================================
  // Get Current User
  // ============================================================
  getCurrentUser(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/me`, { withCredentials: true });
  }

  // ============================================================
  // Helper Methods
  // ============================================================
  isAuthenticated(): boolean           { return !!this.currentUserValue; }
  get currentUserValue()               { return this.currentUserSubject.value; }
  updateCurrentUser(user: LoginResponse) { this.currentUserSubject.next(user); }
  getUserRole(): string | null         { return this.currentUserValue?.role || null; }
  isSuperAdmin(): boolean              { return this.getUserRole() === 'SuperAdmin'; }
  isAdmin(): boolean                   { const r = this.getUserRole(); return r === 'Admin' || r === 'SuperAdmin'; }
  isTeacher(): boolean                 { return this.getUserRole() === 'Teacher'; }
  isStaff(): boolean                   { return this.getUserRole() === 'NonTeachingStaff'; }
  isStudent(): boolean                 { return this.getUserRole() === 'Student'; }
  hasRole(role: string): boolean       { return this.getUserRole() === role; }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    if (userRole === 'SuperAdmin') return true; // SuperAdmin bypasses all role checks
    return userRole ? roles.includes(userRole) : false;
  }

  getUserId(): string | null          { return this.currentUserValue?.userId?.toString() || null; }
  getSchoolId(): string | null        { return this.currentUserValue?.schoolId?.toString() || null; }
  getUserEmail(): string | null       { return this.currentUserValue?.email || null; }
  getSchoolName(): string | null      { return this.currentUserValue?.schoolName || null; }

  getUserName(): string | null {
    const email = this.getUserEmail();
    return email ? email.split('@')[0] : null;
  }

  getUserDisplayName(): string | null {
    return this.getUserEmail();
  }
}