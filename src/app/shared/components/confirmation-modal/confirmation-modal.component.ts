import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <!-- Icon & Title -->
          <div class="modal-header">
            <div class="icon-circle" [ngClass]="iconClass">
              <i class="fas" [ngClass]="icon"></i>
            </div>
            <h3 class="modal-title">{{ title }}</h3>
          </div>

          <!-- Message -->
          <div class="modal-body">
            <p class="modal-message">{{ message }}</p>
            
            <!-- Optional Details -->
            <div class="detail-box" *ngIf="details && details.length > 0">
              <div class="detail-row" *ngFor="let detail of details">
                <span class="detail-label">{{ detail.label }}:</span>
                <span class="detail-value">{{ detail.value }}</span>
              </div>
            </div>

            <!-- Optional Warning -->
            <div class="warning-box" *ngIf="warningText">
              <i class="fas fa-exclamation-triangle"></i>
              <span>{{ warningText }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              (click)="onCancel()"
              [disabled]="loading">
              {{ cancelText }}
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              [ngClass]="confirmButtonClass"
              (click)="onConfirm()"
              [disabled]="loading">
              <i class="fas" [ngClass]="loading ? 'fa-spinner fa-spin' : confirmIcon"></i>
              {{ loading ? loadingText : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 480px;
    width: 90%;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-content {
    padding: 24px;
  }

  /* ✅ UPDATED HEADER STYLES */
  .modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .icon-circle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .icon-circle.danger {
    background: #fee2e2;
    color: #dc2626;
  }

  .icon-circle.warning {
    background: #fef3c7;
    color: #f59e0b;
  }

  .icon-circle.info {
    background: #dbeafe;
    color: #3b82f6;
  }

  .icon-circle.success {
    background: #d1fae5;
    color: #10b981;
  }

  .modal-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    text-align: center;
  }

  .modal-body {
    margin-bottom: 24px;
  }

  .modal-message {
    text-align: center;
    color: #6b7280;
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 16px 0;
  }

  .detail-box {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .detail-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .detail-label {
    color: #6b7280;
    font-weight: 500;
    font-size: 14px;
  }

  .detail-value {
    color: #111827;
    font-weight: 600;
    font-size: 14px;
  }

  .warning-box {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #92400e;
  }

  .warning-box i {
    color: #f59e0b;
    font-size: 18px;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .btn-warning:hover:not(:disabled) {
    background: #d97706;
  }

  @media (max-width: 576px) {
    .modal-container {
      margin: 20px;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
`]
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'OK';
  @Input() cancelText = 'Cancel';
  @Input() loadingText = 'Processing...';
  @Input() loading = false;
  @Input() type: 'danger' | 'warning' | 'info' | 'success' = 'warning';
  @Input() details?: { label: string; value: string }[];
  @Input() warningText?: string;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get iconClass(): string {
    return this.type;
  }

  get icon(): string {
    const icons = {
      danger: 'fa-trash-alt',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
      success: 'fa-check-circle'
    };
    return icons[this.type];
  }

  get confirmIcon(): string {
    return this.type === 'danger' ? 'fa-trash-alt' : 'fa-check';
  }

  get confirmButtonClass(): string {
    return `btn-${this.type === 'info' || this.type === 'success' ? 'primary' : this.type}`;
  }

  onConfirm(): void {
    if (!this.loading) {
      this.confirmed.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }
}