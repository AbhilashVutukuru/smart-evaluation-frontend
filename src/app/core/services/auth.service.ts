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

interface DecodedToken {
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
  'UserId': string;
  'TenantId': string;
  'schoolId': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  'jti': string;
  'exp': number;
  'iss': string;
  'aud': string;
  [key: string]: any;
}

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
      .post<
        ApiResponse<LoginResponse>
      >(`${this.apiUrl}/auth/login`, credentials)
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

  // ============================================================
  // ✅ NEW: ROLE-BASED METHODS
  // ============================================================

  /**
   * Decode JWT token and extract claims
   */
  private decodeToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get user role from JWT token
   */
  getUserRole(): string | null {
    const decoded = this.decodeToken();
    if (!decoded) return null;

    // Your JWT uses this claim path for role
    return (
      decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      null
    );
  }

  /**
   * Check if user is Admin
   */
  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }

  /**
   * Check if user is Teacher
   */
  isTeacher(): boolean {
    return this.getUserRole() === 'Teacher';
  }

  /**
   * Check if user is Student
   */
  isStudent(): boolean {
    return this.getUserRole() === 'Student';
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Get user ID from JWT token
   */
  getUserId(): string | null {
    const decoded = this.decodeToken();
    return decoded?.UserId || null;
  }

  /**
   * Get tenant ID from JWT token
   */
  getTenantId(): string | null {
    const decoded = this.decodeToken();
    return decoded?.TenantId || null;
  }

  getNameIdentifier(): string | null {
  const decoded = this.decodeToken();
  return decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
}

  /**
   * Get school ID from JWT token
   */
  getSchoolId(): string | null {
    const decoded = this.decodeToken();
    return decoded?.schoolId || null;
  }

  /**
   * Get user email from JWT token
   */
  getUserEmail(): string | null {
    const decoded = this.decodeToken();
   if (!decoded) return null;
    // Your JWT uses this claim for email
  return decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const decoded = this.decodeToken();
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Get token expiration date
   */
  getTokenExpiration(): Date | null {
    const decoded = this.decodeToken();
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  }

  getUserName(): string | null {
    const email = this.getUserEmail();
  if (!email) return null;

   return email.split('@')[0];
  }

  getUserDisplayName(): string | null {
    const name = this.getUserName();
    if (!name) return null;

     const cleanName = name
    .replace(/[0-9]/g, '') // Remove numbers: venkatlearning2025 → venkatlearning
    .replace(/[._-]/g, ' ') // Replace separators with space
    .trim();

  // Capitalize first letter of each word
  return cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  }
}
