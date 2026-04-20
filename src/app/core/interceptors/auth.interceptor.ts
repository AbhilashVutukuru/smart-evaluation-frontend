import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  // null  = refresh in progress  → other requests queue and wait
  // true  = refresh succeeded    → queued requests retry
  // false = refresh failed       → queued requests receive an error
  private refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

  constructor(
    private authService: AuthService,
    private logger: LoggerService,
    private router: Router,
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const clonedRequest = request.clone({ withCredentials: true });

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {

        // Auth endpoints handle their own errors — never intercept them
        if (this.isAuthEndpoint(request.url)) {
          return throwError(() => error);
        }

        if (error.status === 401) {
          return this.handle401Error(clonedRequest, next);
        }

        if (error.status === 403) {
          this.router.navigate(['/unauthorized']);
        }

        return throwError(() => error);
      }),
    );
  }

  // ─────────────────────────────────────────────────────────
  // Handle 401 — refresh token then retry
  // ─────────────────────────────────────────────────────────
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      this.logger.info('Attempting token refresh...');

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;

          if (response?.success) {
            this.logger.info('Token refreshed, retrying original request');
            this.refreshTokenSubject.next(true);
            return next.handle(request);
          }

          this.logger.warn('Token refresh returned failure response');
          this.refreshTokenSubject.next(false);
          this.authService.logoutLocal();
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(false);
          this.authService.logoutLocal();
          return throwError(() => error);
        }),
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((result) => result !== null),
      take(1),
      switchMap((succeeded) => {
        if (succeeded) {
          return next.handle(request);
        }
        return throwError(() => new Error('Session expired. Please log in again.'));
      }),
    );
  }

  // ─────────────────────────────────────────────────────────
  // Auth endpoints manage their own errors — never intercept them
  // ─────────────────────────────────────────────────────────
  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh-token',
      '/auth/me',
      '/auth/logout',
    ];
    return authEndpoints.some((endpoint) => url.includes(endpoint));
  }
}