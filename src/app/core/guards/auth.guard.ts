import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUserValue;

  // ❌ Not logged in
  if (!authService.isAuthenticated() || !user) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  // ⚠️ First-time login → force change password
  if (user.requirePasswordChange) {
    router.navigate(['/auth/change-password']);
    return false;
  }

  // ✅ Normal authenticated user
  return true;
};
