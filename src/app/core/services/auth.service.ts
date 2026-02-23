import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  tap,
  catchError,
  throwError,
  firstValueFrom,
} from 'rxjs';
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private logger: LoggerService,
  ) {}

  // ============================================================
  // ✅ Initialize - Called by APP_INITIALIZER
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
          ...response.data
        });
        this.startRefreshTokenTimer();
      }
    } catch (error: any) {
      this.logger.info('No active session');
      this.currentUserSubject.next(null);
    }
  }

//  async initialize(): Promise<void> {
//   try {
//     console.log('🔄 [INITIALIZE] Calling /auth/me...');

//     const response = await firstValueFrom(
//       this.http.get<ApiResponse<any>>(
//         `${this.apiUrl}/auth/me`,
//         { withCredentials: true }
//       )
//     );

//     if (response.success && response.data) {
//       console.log('✅ Session restored:', response.data.email);

//       this.currentUserSubject.next({
//         requirePasswordChange: false,
//         accessToken: '',
//         refreshToken: '',
//         ...response.data
//       });

//       this.startRefreshTokenTimer();
//     } else {
//       this.currentUserSubject.next(null);
//     }
//   } catch (error) {
//     console.log('❌ No active session');
//     this.currentUserSubject.next(null);
//   }
// }

  // ============================================================
  // ✅ Login
  // ============================================================
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.apiUrl}/auth/login`,
        credentials,
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.logger.info('Login successful');
            this.currentUserSubject.next(response.data);
            this.startRefreshTokenTimer();
          }
        }),
        catchError((error) => {
          this.logger.error('Login failed', error);
          return throwError(() => error);
        })
      );
  }

  // ============================================================
  // ✅ Refresh Token
  // ============================================================
  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.apiUrl}/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.logger.info('Token refreshed');
            this.currentUserSubject.next(response.data);
            this.startRefreshTokenTimer();
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Token refresh failed', error);
          this.logout();
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ Auto-Refresh Timer
  // ============================================================
  private startRefreshTokenTimer() {
    this.stopRefreshTokenTimer();
    // Refresh every 50 minutes (token expires in 1 hour)
    this.refreshTokenTimeout = setTimeout(
      () => {
        this.logger.info('Auto-refreshing token...');
        this.refreshToken().subscribe();
      },
      50 * 60 * 1000,
    );
  }

  private stopRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  // ============================================================
  // ✅ Logout
  // ============================================================
   logout(): void {
    this.logger.info('Logging out...');
    this.stopRefreshTokenTimer();
    
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this.currentUserSubject.next(null);
          this.router.navigate(['/auth/login']);
        },
        error: () => {
          this.currentUserSubject.next(null);
          this.router.navigate(['/auth/login']);
        },
      });
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
    console.log('📝 Updating current user');
    this.currentUserSubject.next(user);
  }

  getUserRole(): string | null {
    return this.currentUserValue?.role || null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }

  isTeacher(): boolean {
    return this.getUserRole() === 'Teacher';
  }

  isStudent(): boolean {
    return this.getUserRole() === 'Student';
  }

  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
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
    const name = this.getUserName();
    if (!name) return null;
    return name
      .replace(/[0-9]/g, '')
      .replace(/[._-]/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}