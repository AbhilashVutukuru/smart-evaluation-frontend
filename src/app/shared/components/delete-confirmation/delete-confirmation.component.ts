import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="show" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="modal-close" (click)="onCancel()" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="modal-header">
          <div class="icon-warning">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>{{ title }}</h3>
        </div>
        
        <div class="modal-body">
          <p>{{ message }}</p>
          <div class="item-info" *ngIf="itemName">
            <i class="fas fa-user"></i>
            <strong>{{ itemName }}</strong>
          </div>
          <div class="warning-message">
            <i class="fas fa-info-circle"></i>
            <span>This action cannot be undone!</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="btn btn-danger" (click)="onConfirm()">
            <i class="fas fa-trash"></i> Delete
          </button>
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
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 15px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
      position: relative;
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #6b7280;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      z-index: 1;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .modal-header {
      padding: 30px 30px 15px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }

    .icon-warning {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      border: 3px solid #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .icon-warning i {
      font-size: 28px;
      color: #ef4444;
    }

    .modal-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 24px;
      font-weight: 700;
    }

    .modal-body {
      padding: 15px 30px 25px;
      text-align: center;
    }

    .modal-body p {
      color: #374151;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px;
    }

    .item-info {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 15px;
    }

    .item-info i {
      color: #6366f1;
      font-size: 18px;
    }

    .item-info strong {
      color: #1f2937;
      font-size: 15px;
    }

    .warning-message {
      background: linear-gradient(135deg, #fefce8, #fef3c7);
      border: 2px solid #f59e0b;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .warning-message i {
      color: #f59e0b;
      font-size: 16px;
    }

    .warning-message span {
      color: #92400e;
      font-weight: 600;
      font-size: 14px;
    }

    .modal-footer {
      padding: 20px 30px 30px;
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn {
      padding: 12px 30px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-family: inherit;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }

    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    @media (max-width: 480px) {
      .modal-content {
        margin: 20px;
      }

      .modal-header {
        padding: 25px 20px 15px;
        flex-direction: column;
        gap: 10px;
      }

      .icon-warning {
        width: 50px;
        height: 50px;
      }

      .icon-warning i {
        font-size: 24px;
      }

      .modal-header h3 {
        font-size: 20px;
      }

      .modal-body {
        padding: 10px 20px 20px;
      }

      .modal-footer {
        padding: 15px 20px 25px;
        flex-direction: column;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class DeleteConfirmationComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Confirm Delete';
  @Input() message: string = 'Are you sure you want to delete this item?';
  @Input() itemName?: string;
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}