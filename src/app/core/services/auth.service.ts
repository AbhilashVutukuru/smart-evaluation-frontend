import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
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
  ) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
      this.startRefreshTokenTimer();
    }
  }

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
  return this.http
    .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, credentials)
    .pipe(
      tap((response) => {
        if (response.success && response.data) {
          // Store tokens first
          localStorage.setItem('currentUser', JSON.stringify(response.data));
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          this.currentUserSubject.next(response.data);

          // Check if password change required AFTER storing tokens
          // if (response.data.requirePasswordChange) {
          //   this.router.navigate(['/auth/change-password']); // No sidebar route
          //   return;
          // }
           this.currentUserSubject.next(response.data);
          this.startRefreshTokenTimer();
        }
      }),
    );
}

  refreshToken(): Observable<ApiResponse<LoginResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http
      .post<
        ApiResponse<LoginResponse>
      >(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            localStorage.setItem('currentUser', JSON.stringify(response.data));
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            this.currentUserSubject.next(response.data);
            this.startRefreshTokenTimer();
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.logout();
          return throwError(() => error);
        }),
      );
  }

  private startRefreshTokenTimer() {
    const token = this.getToken();
    if (!token) return;

    // Parse JWT to get expiry
    const jwtToken = JSON.parse(atob(token.split('.')[1]));
    const expires = new Date(jwtToken.exp * 1000);
    const timeout = expires.getTime() - Date.now() - 60 * 1000; // Refresh 1 min before expiry

    this.refreshTokenTimeout = setTimeout(() => {
      this.refreshToken().subscribe();
    }, timeout);
  }

  private stopRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

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
    );
  }

  updateCurrentUser(user: LoginResponse): void {
  this.currentUserSubject.next(user);
}

  logout(): void {
    this.stopRefreshTokenTimer();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  get currentUserValue(): LoginResponse | null {
    return this.currentUserSubject.value;
  }
}
