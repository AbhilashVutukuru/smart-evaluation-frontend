// ============================================
// SHARED ERROR HANDLER UTILITY
// ============================================

import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private toastService = inject(ToastService);

  /**
   * Handles any HTTP error:
   * - 404 → showWarning + runs optional onNotFound callback for UI state
   * - anything else → showError
   *
   * @example
   * this.errorHandler.handleHttpError(error, 'Failed to load students', () => {
   *   this.noExamPaperFound = true;
   *   this.students = [];
   *   this.showStudentsCard = true;
   * });
   */
  handleHttpError(error: unknown, fallbackMessage: string, onNotFound?: () => void): void {
    const status = this.getStatus(error);
    const message = this.extractMessage(error) || fallbackMessage;

    if (!this.isProduction()) {
      console.error('Error Details:', { fallbackMessage, error, message });
    }

    if (status === 404) {
      onNotFound?.();
      this.toastService.showWarning('Warning', message);
    } else {
      this.toastService.showError('Error', message);
    }
  }

  /** Convenience wrapper — same as handleHttpError without a 404 callback. */
  handle(userMessage: string, error: unknown): void {
    this.handleHttpError(error, userMessage);
  }

  /** Pull a human-readable message from various Angular/HTTP error shapes. */
  extractMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return '';

    const err = error as Record<string, unknown>;

    let raw = '';

    if (typeof err['error'] === 'object' && err['error'] !== null) {
      const inner = err['error'] as Record<string, unknown>;
      if (typeof inner['message'] === 'string') raw = inner['message'];
      else if (Array.isArray(inner['errors'])) raw = (inner['errors'] as string[]).join(', ');
    }

    if (!raw && typeof err['message'] === 'string') raw = err['message'];
    if (!raw && typeof err['error'] === 'string')   raw = err['error'];
    if (!raw && typeof err['statusText'] === 'string') raw = err['statusText'];

    return this.sanitizeMessage(raw);
  }

  /**
   * If the message looks like a raw technical/server error, replace it with
   * a single generic message. Normal API validation messages pass through unchanged.
   */
  private sanitizeMessage(message: string): string {
    if (!message) return '';

    const technicalPatterns = [
      // SQL / database
      'FOREIGN KEY', 'MERGE statement', 'conflict occurred in database',
      'UNIQUE KEY', 'duplicate key', 'Cannot insert duplicate',
      'Timeout expired', 'Execution Timeout',
      'SqlException', 'SQLException', 'Database save failed',
      // .NET stack traces
      'System.', 'Microsoft.', 'StackTrace', 'Inner Exception',
      // Generic server error indicators
      'Object reference', 'NullReferenceException', 'Unhandled exception',
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