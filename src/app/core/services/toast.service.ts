import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id      : string;
  type    : 'success' | 'error' | 'warning' | 'info';
  title   : string;
  message : string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new Subject<Toast>();
  readonly toasts$ = this.toastSubject.asObservable();

  showSuccess(title: string, message: string, duration = 3000): void {
    this.show('success', title, message, duration);
  }

  showError(title: string, message: string, duration = 5000): void {
    this.show('error', title, message, duration);
  }

  showWarning(title: string, message: string, duration = 4000): void {
    this.show('warning', title, message, duration);
  }

  showInfo(title: string, message: string, duration = 3000): void {
    this.show('info', title, message, duration);
  }

  private show(type: Toast['type'], title: string, message: string, duration: number): void {
    this.toastSubject.next({
      // FIX: crypto.randomUUID() replaces the deprecated String.substr()
      // and is cryptographically random — no collisions
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      type,
      title,
      message,
      duration,
    });
  }
}