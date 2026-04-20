import { Injectable, isDevMode } from '@angular/core';

/**
 * LoggerService
 *
 * FIX: replaced environment.production with Angular's built-in isDevMode().
 * isDevMode() is set at compile time by the Angular build toolchain —
 * no manual environment import needed, works correctly in all build modes.
 *
 * In production: only error() sends to monitoring — nothing appears in console.
 * In development: all levels appear in console with visual prefixes.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {

  log(message: string, ...args: unknown[]): void {
    if (isDevMode()) console.log(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (isDevMode()) console.info(`ℹ️ ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (isDevMode()) console.warn(`⚠️ ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (isDevMode()) {
      console.error(`❌ ${message}`, ...args);
    } else {
      // FIX: in production send to a real monitoring service
      // Uncomment and configure one of these:
      // Sentry.captureException(new Error(message));
      // appInsights.trackException({ exception: new Error(message) });
      this.sendToMonitoring(message, args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (isDevMode()) console.debug(`🔍 ${message}`, ...args);
  }

  private sendToMonitoring(_message: string, _args: unknown[]): void {
    // TODO: wire up Sentry / Azure App Insights / Datadog here
  }
}