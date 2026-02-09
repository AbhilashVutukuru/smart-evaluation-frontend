import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastConfig } from '../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="toast$ | async as toast" 
         [ngClass]="'toast-container toast-' + toast.type"
         [@slideIn]>
      <div class="toast-icon">
        <i [class]="getIcon(toast.type)"></i>
      </div>
      <div class="toast-content">
        <strong>{{ toast.title }}</strong>
        <p>{{ toast.message }}</p>
      </div>
      <button (click)="closeToast()" class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 350px;
      max-width: 450px;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Success Toast */
    .toast-success {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      color: #065f46;
    }

    .toast-success .toast-icon {
      background: #10b981;
    }

    /* Error Toast */
    .toast-error {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #ef4444;
      color: #991b1b;
    }

    .toast-error .toast-icon {
      background: #ef4444;
    }

    /* Warning Toast */
    .toast-warning {
      background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
      border: 2px solid #f59e0b;
      color: #92400e;
    }

    .toast-warning .toast-icon {
      background: #f59e0b;
    }

    /* Info Toast */
    .toast-info {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #3b82f6;
      color: #1e40af;
    }

    .toast-info .toast-icon {
      background: #3b82f6;
    }

    /* Icon */
    .toast-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    /* Content */
    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-content strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 700;
      font-size: 15px;
    }

    .toast-content p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    /* Close Button */
    .toast-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: all 0.2s ease;
      flex-shrink: 0;
      border-radius: 6px;
    }

    .toast-close:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.05);
    }

    .toast-close:active {
      transform: scale(0.95);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);
  toast$!: Observable<ToastConfig | null>;

  ngOnInit(): void {
    this.toast$ = this.toastService.toast$;
  }

  closeToast(): void {
    //this.toastService.hide();
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
  }
}