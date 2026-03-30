// ============================================
// SHARED ERROR HANDLER UTILITY
// ============================================

import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private toastService = inject(ToastService);

  handleHttpError(error: unknown, fallbackMessage: string, onNotFound?: () => void): void {
    const status = this.getStatus(error);

    // 401 — session expired; AuthService.logoutLocal() handles redirect silently
    if (status === 401) return;

    // 0 — network error / CORS / server unreachable — never show raw Angular message
    if (status === 0) {
      this.toastService.showError('Connection Error', 'Unable to reach the server. Please check your connection and try again.');
      return;
    }

    const message = this.extractMessage(error) || fallbackMessage;

    if (!this.isProduction()) {
      console.error('Error Details:', { fallbackMessage, error, message });
    }

    if (status === 404) {
      onNotFound?.();
      this.toastService.showWarning('Warning', message);
    } else if (status === 403) {
      this.toastService.showError('Access Denied', 'You do not have permission to perform this action.');
    } else {
      this.toastService.showError('Error', message);
    }
  }

  /** Convenience wrapper — same as handleHttpError without a 404 callback. */
  handle(userMessage: string, error: unknown): void {
    // Skip silently-marked errors (e.g. refresh token failures already handled by logoutLocal)
    if (error && typeof error === 'object' && (error as any).silent === true) return;
    this.handleHttpError(error, userMessage);
  }

  /** Pull a human-readable message from various Angular/HTTP error shapes. */
  extractMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return '';

    const err = error as Record<string, unknown>;
    const status = this.getStatus(error);

    // Status-based overrides — never show raw HTTP/token text
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 0)   return 'Unable to reach the server. Please check your connection.';

    let raw = '';

    if (typeof err['error'] === 'object' && err['error'] !== null) {
      const inner = err['error'] as Record<string, unknown>;
      // GlobalExceptionHandlerMiddleware sends { success, message }
      if (typeof inner['message'] === 'string')   raw = inner['message'];
      else if (Array.isArray(inner['errors']))     raw = (inner['errors'] as string[]).join(', ');
      else if (typeof inner['title'] === 'string') raw = inner['title']; // ASP.NET ProblemDetails
    }

    if (!raw && typeof err['message'] === 'string') raw = err['message'];
    if (!raw && typeof err['error'] === 'string')   raw = err['error'];
    // ❌ Never fall back to statusText — shows raw "Unauthorized", "Bad Request" etc.

    return this.sanitizeMessage(raw);
  }

  /**
   * Replaces raw technical / internal messages with a generic user-friendly string.
   * Safe domain messages (e.g. "Email already registered") pass through unchanged.
   */
  private sanitizeMessage(message: string): string {
    if (!message) return '';

    const technicalPatterns = [
      // SQL / database internals
      'FOREIGN KEY', 'MERGE statement', 'conflict occurred in database',
      'UNIQUE KEY', 'duplicate key', 'Cannot insert duplicate',
      'Timeout expired', 'Execution Timeout',
      'SqlException', 'SQLException', 'Database save failed',
      // .NET stack traces / runtime errors
      'System.', 'Microsoft.', 'StackTrace', 'Inner Exception',
      'Object reference', 'NullReferenceException', 'Unhandled exception',
      // Auth / token internals
      'invalid_grant', 'invalid_token', 'refresh_token',
      'Invalid refresh token', 'Token has expired', 'Refresh token',
      // Angular HttpClient raw error strings
      'Http failure response', 'Http failure during parsing',
      'Unknown Error', '0 Unknown',
    ];

    const isTechnical = technicalPatterns.some(p => message.includes(p));

    return isTechnical
      ? 'Something went wrong. Please try again or contact support.'
      : message;
  }

  private getStatus(error: unknown): number | null {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as Record<string, unknown>)['status'] as number;
    }
    return null;
  }

  private isProduction(): boolean {
    // return environment.production;
    return false;
  }
}