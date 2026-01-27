import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastConfig | null>(null);
  public toast$: Observable<ToastConfig | null> = this.toastSubject.asObservable();

  showSuccess(title: string, message: string): void {
    this.toastSubject.next({ type: 'success', title, message });
    setTimeout(() => this.toastSubject.next(null), 5000);
  }

  showError(title: string, message: string): void {
    this.toastSubject.next({ type: 'error', title, message });
    setTimeout(() => this.toastSubject.next(null), 5000);
  }

  showWarning(title: string, message: string): void {
    this.toastSubject.next({ type: 'warning', title, message });
    setTimeout(() => this.toastSubject.next(null), 5000);
  }

  showInfo(title: string, message: string): void {
    this.toastSubject.next({ type: 'info', title, message });
    setTimeout(() => this.toastSubject.next(null), 5000);
  }
}
