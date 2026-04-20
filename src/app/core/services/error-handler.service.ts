import { Injectable, inject, isDevMode } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private toastService = inject(ToastService);

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Full HTTP error handler — maps status codes to user-safe messages and
   * delegates to ToastService. Call this from HTTP error callbacks.
   *
   * @param error         The raw error from the HTTP subscription
   * @param fallbackMessage Safe generic message shown when nothing better is available
   * @param onNotFound    Optional callback fired on 404 before the toast shows
   */
  handleHttpError(error: unknown, fallbackMessage: string, onNotFound?: () => void): void {
    const status = this.getStatus(error);

    // FIX: log in dev regardless of where the call originates — centralised in one place
    if (isDevMode()) {
      console.error('[ErrorHandlerService]', { status, fallbackMessage, error });
    }

    // 401 — interceptor + logoutLocal() already handle this silently
    if (status === 401) return;

    // 0 — no response: network error, CORS, server unreachable
    if (status === 0) {
      this.toastService.showError(
        'Connection Error',
        'Unable to reach the server. Please check your connection and try again.',
      );
      return;
    }

    if (status === 403) {
      this.toastService.showError('Access Denied', 'You do not have permission to perform this action.');
      return;
    }

    if (status === 404) {
      onNotFound?.();
      // FIX: 404 shows as a warning with the fallback — never the raw server message
      this.toastService.showWarning('Not Found', fallbackMessage);
      return;
    }

    if (status === 429) {
      this.toastService.showWarning('Slow Down', 'Too many requests. Please wait a moment and try again.');
      return;
    }

    if (status !== null && status >= 500) {
      // FIX: 5xx errors must ALWAYS show a generic message — never server internals
      this.toastService.showError('Server Error', 'Something went wrong on our end. Please try again later.');
      return;
    }

    // 400 and other 4xx — extract message but run it through sanitizer first
    const message = this.extractMessage(error) || fallbackMessage;
    this.toastService.showError('Error', message);
  }

  /**
   * Convenience wrapper for non-HTTP errors or when you only have a
   * user-facing message and no 404 callback needed.
   *
   * FIX: signature changed — userMessage comes first (what to show the user),
   * error is now optional (not all callers have an error object, e.g. profile load).
   * This also prevents callers accidentally passing the raw error as the message.
   */
  handle(userMessage: string, error?: unknown): void {
    if (!error) {
      // No error object — just show the message directly
      this.toastService.showError('Error', userMessage);
      if (isDevMode()) console.error('[ErrorHandlerService]', userMessage);
      return;
    }

    // FIX: check for silent flag before any processing
    if (this.isSilent(error)) return;

    this.handleHttpError(error, userMessage);
  }

  /**
   * Extracts and sanitises a human-readable message from an HTTP error.
   * Public so callers can use it for custom toast titles without calling
   * the full handleHttpError flow.
   */
  extractMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return '';

    const err    = error as Record<string, unknown>;
    const status = this.getStatus(error);

    // Status-based overrides — these are always safe fixed strings
    if (status === 401) return 'Your session has expired. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status === 0)   return 'Unable to reach the server. Please check your connection.';

    // FIX: 5xx — always return empty so callers fall back to their generic message
    if (status !== null && status >= 500) return '';

    let raw = '';

    if (typeof err['error'] === 'object' && err['error'] !== null) {
      const inner = err['error'] as Record<string, unknown>;

      // GlobalExceptionHandlerMiddleware shape: { success, message, errors, correlationId }
      if (typeof inner['message'] === 'string') {
        raw = inner['message'];
      } else if (Array.isArray(inner['errors'])) {
        // Validation errors array — join field messages
        raw = (inner['errors'] as string[]).filter(Boolean).join('. ');
      } else if (typeof inner['title'] === 'string') {
        // ASP.NET ProblemDetails fallback
        raw = inner['title'];
      }
    }

    // FIX: only fall back to err['message'] if it doesn't look like an
    // Angular internal message (those start with "Http failure")
    if (!raw && typeof err['message'] === 'string') {
      const m = err['message'] as string;
      if (!m.startsWith('Http failure')) raw = m;
    }

    if (!raw && typeof err['error'] === 'string') raw = err['error'];

    // Never use statusText — shows raw "Unauthorized", "Bad Request" etc.

    return this.sanitizeMessage(raw);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Replaces technical / internal messages with a safe generic string.
   * Domain messages ("Email already registered") pass through unchanged.
   *
   * FIX: patterns compiled to lowercase comparison so casing variants are caught.
   * e.g. "sqlexception" and "SqlException" both match.
   */
  private sanitizeMessage(message: string): string {
    if (!message) return '';

    const lower = message.toLowerCase();

    const technicalPatterns = [
      // SQL / database internals
      'foreign key', 'merge statement', 'conflict occurred in database',
      'unique key', 'duplicate key', 'cannot insert duplicate',
      'timeout expired', 'execution timeout',
      'sqlexception', 'database save failed',
      // FIX: added more EF Core / ADO.NET patterns
      'microsoft.data.sqlclient', 'entityframeworkcore',
      'dbcontext', 'dbset', 'migration',
      // .NET stack traces / runtime errors
      'system.', 'microsoft.', 'stacktrace', 'inner exception',
      'object reference', 'nullreferenceexception', 'unhandled exception',
      'at system.', 'at microsoft.', // stack trace lines
      // Auth / token internals
      'invalid_grant', 'invalid_token', 'refresh_token',
      'invalid refresh token', 'token has expired',
      // Angular HttpClient raw error strings
      'http failure response', 'http failure during parsing',
      'unknown error', '0 unknown',
      // Generic technical terms that should never reach the user
      'exception', 'stack trace', 'traceback',
    ];

    const isTechnical = technicalPatterns.some(p => lower.includes(p));

    return isTechnical
      ? 'Something went wrong. Please try again or contact support.'
      : message;
  }

  /** Safely extracts the HTTP status code from any error shape. */
  private getStatus(error: unknown): number | null {
    if (error && typeof error === 'object' && 'status' in error) {
      const s = (error as Record<string, unknown>)['status'];
      return typeof s === 'number' ? s : null;
    }
    return null;
  }

  /**
   * FIX: removed (error as any) cast — typed properly.
   * Checks for the silent marker set by the auth interceptor on
   * refresh-token failures that logoutLocal() already handles.
   */
  private isSilent(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'silent' in error &&
      (error as Record<string, unknown>)['silent'] === true
    );
  }
}