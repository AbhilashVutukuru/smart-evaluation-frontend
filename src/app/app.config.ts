import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Preloads all lazy route chunks in the background after initial load —
    // navigation to any lazy route feels instant, no blank screen delay
    provideRouter(routes, withPreloading(PreloadAllModules)),

    provideAnimations(),

    // Class-based interceptor registration — matches your existing AuthInterceptor
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },

    // Restores session from HttpOnly cookie on every page load / refresh
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initialize();
    }),
  ],
};