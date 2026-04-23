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

  // ── Idle Logout ─────────────────────────────────────────────
  // Per-tab only. Each tab tracks its own inactivity independently.
  // Idle logout NEVER broadcasts to other tabs — a tab that is idle
  // logs itself out silently. Other tabs with activity keep running.
  //private readonly IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 min (testing)
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 min (production)
  private idleTimeout?: any;
  private stopIdle$ = new Subject<void>();

  // ── BroadcastChannel — cross-tab coordination ──────────────
  // Three message types only:
  //   { type: 'token_refreshed', expiresAt: string }
  //     → Sent by whichever tab successfully refreshed.
  //       All other tabs cancel their pending refresh timers and
  //       reschedule based on the new expiry. They never call the API.
  //
  //   { type: 'logout' }
  //     → Sent ONLY on explicit user logout (sidebar button).
  //       Idle logout does NOT send this — it is tab-scoped.
  //
  //   { type: 'activity' }
  //     → NOT used. Cross-tab idle sync was removed because it caused
  //       idle in Tab A to keep Tab B alive unintentionally.
  //       Each tab now manages its own idle timer independently.
  private readonly channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('auth_sync')
    : null;

  // ── Refresh leader lock (localStorage) ──────────────────────
  // PROBLEM: Tab A and Tab B both open. Both call initialize() → both
  // schedule a refresh timer for the same expiry. Both timers fire at
  // the same moment. Tab A hits the backend first → backend ROTATES the
  // refresh token cookie. Tab B arrives milliseconds later with the OLD
  // cookie → 401 → both tabs log out. This is the "invalid token" bug.
  //
  // SOLUTION — Leader election via localStorage:
  //   Before calling the API, a tab atomically writes its own unique ID
  //   as the leader. Any other tab that fires checks the leader key and
  //   sees it is NOT the leader → skips the API call entirely.
  //   The winning tab broadcasts 'token_refreshed' → all other tabs
  //   reschedule their timers. Only one HTTP request ever reaches the backend.
  //
  // Why localStorage instead of BroadcastChannel for the lock?
  //   BroadcastChannel messages are async — by the time Tab B receives
  //   "Tab A is refreshing", Tab B has already sent its own request.
  //   localStorage reads are synchronous — Tab B checks before sending.
  private readonly LEADER_KEY   = 'se_refresh_leader';   // which tab owns the refresh
  private readonly LEADER_TTL   = 15_000;                 // 15 s — clears if tab crashes mid-refresh
  private readonly tabId        = `tab_${Math.random().toString(36).slice(2)}`; // unique per tab instance

  constructor(
    private http: HttpClient,
    private router: Router,
    private logger: LoggerService,
    private ngZone: NgZone,
  ) {
    this.listenToCrossTabMessages();
  }

  // ============================================================
  // Cross-tab message listener
  // ============================================================
  private listenToCrossTabMessages(): void {
    if (!this.channel) return;

    this.channel.onmessage = (event) => {
      const msg = event.data as { type: string; expiresAt?: string };

      switch (msg.type) {

        // Another tab refreshed the token successfully.
        // Cancel our pending refresh and reschedule based on the new expiry.
        // We do NOT call the API — the cookie is already updated by the winning tab.
        case 'token_refreshed':
          this.logger.info('Token refreshed by another tab — rescheduling timer');
          this.ngZone.run(() => this.startRefreshTokenTimer(msg.expiresAt));
          break;

        // Explicit user logout from another tab — log out here too.
        // This is NOT triggered by idle logout (idle is tab-scoped).
        case 'logout':
          this.ngZone.run(() => {
            this.logger.info('Logout broadcast received — clearing session');
            this.stopRefreshTokenTimer();
            this.stopIdleTimer();
            this.currentUserSubject.next(null);
            this.router.navigate(['/auth/login']);
          });
          break;
      }
    };
  }

  // ============================================================
  // Idle Logout Timer  —  PER-TAB, never cross-tab
  // ============================================================
  private startIdleTimer(): void {
    // stopIdleTimer() completes the old stopIdle$ and allocates a fresh one.
    // This terminates any existing activity$ subscription before creating a new one,
    // preventing duplicate event listeners when startIdleTimer() is called twice
    // (once in initialize() on page load, once again in login()).
    this.stopIdleTimer();

    this.ngZone.runOutsideAngular(() => {
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

      // Each activity event resets only THIS tab's idle countdown.
      // No broadcast — Tab B's idle is Tab B's own business.
      activity$.subscribe(() => this.resetIdleTimer());

      this.resetIdleTimer(); // start the initial countdown
    });
  }

  private resetIdleTimer(): void {
    clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => this.onIdle(), this.IDLE_TIMEOUT_MS);
  }

  private onIdle(): void {
    this.ngZone.run(() => {
      this.logger.info('This tab idle — logging out tab only');
      this.stopIdleTimer();
      //  CRITICAL: call logoutThisTabOnly(), NOT logout().
      // logout() broadcasts 'logout' and hits the server — that would kill ALL tabs.
      // We only want to clear this tab's local state and redirect to login.
      this.logoutThisTabOnly();
    });
  }

  private stopIdleTimer(): void {
    clearTimeout(this.idleTimeout);
    this.stopIdle$.next();
    this.stopIdle$.complete();
    this.stopIdle$ = new Subject<void>();
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
  // Refresh Token  —  called only by the elected leader tab
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
            this.logger.info('Token refreshed successfully');

            // Merge — refresh endpoint only returns token fields, not role/schoolName.
            // Full replace would lose role → guard redirects to /unauthorized.
            const existing = this.currentUserSubject.value;
            this.currentUserSubject.next({ ...existing, ...response.data });

            // Reschedule this tab's own timer first.
            this.startRefreshTokenTimer(response.data.accessTokenExpiresAt);

            // Then tell all other tabs the new expiry.
            // They will reschedule their timers and will NOT call the API.
            this.channel?.postMessage({
              type:      'token_refreshed',
              expiresAt: response.data.accessTokenExpiresAt,
            });
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Token refresh failed', error);
          this.releaseLeader();     // remove stale lock so next refresh can elect a leader
          this.logoutLocal();       // full logout — refresh token is dead
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // Auto-Refresh Timer  —  Leader Election
  // ============================================================

  // ── Leader helpers ────────────────────────────────────────
  // Leader record stored in localStorage:
  //   { tabId: string, claimedAt: number }
  // A tab is the leader if:
  //   (a) no leader record exists, OR
  //   (b) the existing record belongs to THIS tab, OR
  //   (c) the existing record is older than LEADER_TTL (the previous leader crashed)

  private electLeader(): boolean {
    try {
      const raw = localStorage.getItem(this.LEADER_KEY);
      if (raw) {
        const record = JSON.parse(raw) as { tabId: string; claimedAt: number };
        const age = Date.now() - record.claimedAt;

        if (record.tabId !== this.tabId && age < this.LEADER_TTL) {
          // Another tab holds a fresh lock — it will refresh. We stand down.
          this.logger.info(`Tab ${record.tabId} is refresh leader — skipping`);
          return false;
        }
      }

      // No leader, stale leader, or we are already the leader — claim it.
      localStorage.setItem(this.LEADER_KEY, JSON.stringify({
        tabId:     this.tabId,
        claimedAt: Date.now(),
      }));
      return true;
    } catch {
      // localStorage unavailable (private mode edge case) — allow refresh
      return true;
    }
  }

  private releaseLeader(): void {
    try {
      const raw = localStorage.getItem(this.LEADER_KEY);
      if (!raw) return;
      const record = JSON.parse(raw) as { tabId: string };
      // Only release our own lock — never clear another tab's lock.
      if (record.tabId === this.tabId) {
        localStorage.removeItem(this.LEADER_KEY);
      }
    } catch { /* ignore */ }
  }

  // ── Timer ─────────────────────────────────────────────────
  private startRefreshTokenTimer(expiresAt?: string | Date): void {
    this.stopRefreshTokenTimer();

    // Refresh 60 s before expiry. Falls back to 55 min if no expiry provided.
    let msUntilRefresh = 55 * 60 * 1000;

    if (expiresAt) {
      const expiryMs = new Date(expiresAt).getTime();
      msUntilRefresh = Math.max(expiryMs - Date.now() - 60_000, 5_000);
    }

    this.logger.info(`Refresh scheduled in ${Math.round(msUntilRefresh / 1000)}s (tab: ${this.tabId})`);

    this.refreshTokenTimeout = setTimeout(() => {
      // Synchronous leader election — only ONE tab proceeds to the API.
      // All other tabs read localStorage, see a fresh leader, and return early.
      // They will be rescheduled by the 'token_refreshed' BroadcastChannel message.
      if (!this.electLeader()) return;

      this.logger.info(`This tab is leader — refreshing token`);

      this.refreshToken().subscribe({
        next:  () => this.releaseLeader(),
        error: () => {}, // releaseLeader + logoutLocal already called in catchError
      });
    }, msUntilRefresh);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
  }

  // ============================================================
  // Logout variants
  // ============================================================

  // Full logout — explicit user action (sidebar button).
  // Broadcasts to all tabs. Calls the backend to revoke the refresh token.
  logout(returnUrl?: string): void {
    this.logger.info('User logout initiated');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();
    this.releaseLeader();

    // Clear state before the HTTP call so LoginComponent never sees a stale user.
    this.currentUserSubject.next(null);

    if (returnUrl && returnUrl !== '/auth/login') {
      sessionStorage.setItem('postLoginRedirect', returnUrl);
    }

    //  Only broadcast on explicit logout — NOT on idle logout.
    this.channel?.postMessage({ type: 'logout' });

    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => this.router.navigate(['/auth/login']),
        error:    () => this.router.navigate(['/auth/login']),
      });
  }

  // Tab-only idle logout — clears THIS tab's state only.
  // No broadcast, no server call.
  // Other tabs remain alive with their own valid sessions.
  private logoutThisTabOnly(): void {
    this.logger.info('Idle logout — this tab only');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();
    this.releaseLeader();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // Local state clear — used by interceptor after refresh failure.
  // No broadcast, no server call (server already rejected the token).
  logoutLocal(): void {
    this.logger.info('Clearing local session');
    this.stopRefreshTokenTimer();
    this.stopIdleTimer();
    this.releaseLeader();
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
  isAuthenticated(): boolean             { return !!this.currentUserValue; }
  get currentUserValue()                 { return this.currentUserSubject.value; }
  updateCurrentUser(user: LoginResponse) { this.currentUserSubject.next(user); }
  getUserRole(): string | null           { return this.currentUserValue?.role || null; }
  isSuperAdmin(): boolean                { return this.getUserRole() === 'SuperAdmin'; }
  isAdmin(): boolean                     { const r = this.getUserRole(); return r === 'Admin' || r === 'SuperAdmin'; }
  isTeacher(): boolean                   { return this.getUserRole() === 'Teacher'; }
  isStaff(): boolean                     { return this.getUserRole() === 'NonTeachingStaff'; }
  isStudent(): boolean                   { return this.getUserRole() === 'Student'; }
  hasRole(role: string): boolean         { return this.getUserRole() === role; }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    if (userRole === 'SuperAdmin') return true;
    return userRole ? roles.includes(userRole) : false;
  }

  getUserId(): string | null     { return this.currentUserValue?.userId?.toString() || null; }
  getSchoolId(): string | null   { return this.currentUserValue?.schoolId?.toString() || null; }
  getUserEmail(): string | null  { return this.currentUserValue?.email || null; }
  getSchoolName(): string | null { return this.currentUserValue?.schoolName || null; }

  getUserName(): string | null {
    const email = this.getUserEmail();
    return email ? email.split('@')[0] : null;
  }

  getUserDisplayName(): string | null {
    return this.getUserEmail();
  }
}