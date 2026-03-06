// ✅ COMPLETE TOAST SERVICE - Replace your existing one

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  toasts$ = this.toastSubject.asObservable();  // ✅ Remove 'public' keyword

  showSuccess(title: string, message: string, duration: number = 3000): void {
    this.show('success', title, message, duration);
  }

  showError(title: string, message: string, duration: number = 5000): void {
    this.show('error', title, message, duration);
  }

  showWarning(title: string, message: string, duration: number = 4000): void {
    this.show('warning', title, message, duration);
  }

  showInfo(title: string, message: string, duration: number = 3000): void {
    this.show('info', title, message, duration);
  }

  private show(type: Toast['type'], title: string, message: string, duration: number): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      title,
      message,
      duration
    };
    this.toastSubject.next(toast);
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}