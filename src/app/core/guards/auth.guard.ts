import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

// ─────────────────────────────────────────────────────────────
// AUTH GUARD
// Protects routes that require the user to be logged in.
// Uses currentUser$ (Observable) with take(1) — reads once and
// completes, no long-lived subscription.
// Returns UrlTree instead of calling router.navigate() directly —
// Angular's router handles the redirect cleanly with no race conditions.
// ─────────────────────────────────────────────────────────────
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) return true;

      // Return UrlTree instead of router.navigate() + return false.
      // UrlTree is the Angular-recommended way — it lets the router manage
      // the navigation itself, preventing double-navigation race conditions.
      //
      // Sanitize returnUrl — reject absolute URLs and protocol-relative
      // URLs to prevent open redirect attacks (attacker links to
      // /auth/login?returnUrl=https://evil.com and user gets redirected there).
      const raw       = state.url;
      const returnUrl = isSafeReturnUrl(raw) ? raw : '/dashboard';

      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl }
      });
    })
  );
};

// ─────────────────────────────────────────────────────────────
// ROLE GUARD
// Protects routes that require specific roles.
// Usage in routes:
//   canActivate: [authGuard, roleGuard(['Admin', 'SuperAdmin'])]
//
// IMPORTANT: This guard reads role synchronously from currentUserSubject.
// It is safe ONLY because APP_INITIALIZER awaits authService.initialize()
// before the router activates any route. If APP_INITIALIZER ever becomes
// non-awaited, currentUserSubject will be null at guard evaluation time
// and every authenticated user will be redirected to /unauthorized silently.
// ─────────────────────────────────────────────────────────────
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    // SuperAdmin bypasses all role checks
    if (authService.isSuperAdmin()) return true;

    if (authService.hasAnyRole(allowedRoles)) return true;

    // Authenticated but wrong role → 403 page
    return router.createUrlTree(['/unauthorized']);
  };
};

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Returns true only if the URL is a safe same-app relative path.
 * Rejects:
 *   - Absolute URLs:           https://evil.com/steal
 *   - Protocol-relative URLs:  //evil.com/steal
 *   - Data URLs:               data:text/html,...
 *   - Javascript URLs:         javascript:alert(1)
 *   - Anything not starting with /
 *   - Auth routes as returnUrl: /auth/login, /auth/forgot-password etc.
 */
function isSafeReturnUrl(url: string): boolean {
  if (!url) return false;

  // Must start with / but NOT // (protocol-relative)
  if (!url.startsWith('/'))  return false;
  if (url.startsWith('//')) return false;

  // Block javascript: and data: URIs that could slip through
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('javascript:')) return false;
  if (lower.startsWith('data:'))       return false;

  // Block auth routes as returnUrl — no point sending back to login
  if (lower.startsWith('/auth/')) return false;

  return true;
}