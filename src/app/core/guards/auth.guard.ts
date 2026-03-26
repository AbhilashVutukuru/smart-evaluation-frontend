// import { inject } from '@angular/core';
// import { Router, CanActivateFn } from '@angular/router';
// import { AuthService } from '../services/auth.service';
// import { LoggerService } from '../services/logger.service';

// export const authGuard: CanActivateFn = (route, state) => {
//   const authService = inject(AuthService);
//   const router = inject(Router);
//   const logger = inject(LoggerService); 

//   if (authService.currentUserValue) {
//     logger.debug('Auth Guard: User authenticated');
//     return true;
//   }

//   logger.debug('Auth Guard: Not authenticated, redirecting to login');
  
//   router.navigate(['/auth/login'], {
//     queryParams: { returnUrl: state.url }
//   });
  
//   return false;
// };

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    })
  );
};