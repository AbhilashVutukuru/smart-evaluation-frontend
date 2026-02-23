import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  log(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.error(`❌ ${message}`, ...args);
    }
    // ✅ In production, send errors to monitoring service
    // this.sendToMonitoring(message, args);
  }

  debug(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.debug(`🔍 ${message}`, ...args);
    }
  }

  // ✅ Optional: Send critical errors to monitoring even in production
  private sendToMonitoring(message: string, args: any[]): void {
    // Send to Sentry, Application Insights, etc.
    // Example: Sentry.captureException(new Error(message));
  }
}
