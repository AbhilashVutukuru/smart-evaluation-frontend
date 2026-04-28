import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Uses global.css confirm-dialog classes (lines 1013–1178) -->
    <div class="confirm-overlay adp-confirm-overlay" *ngIf="show" (click)="onCancel()">
      <div class="confirm-dialog-box" (click)="$event.stopPropagation()">

        <!-- Icon -->
        <div class="confirm-dialog-icon confirm-dialog-icon--danger">
          <i class="fas fa-exclamation-triangle"></i>
        </div>

        <!-- Title -->
        <p class="confirm-dialog-title">{{ title }}</p>

        <!-- Message -->
        <p class="confirm-dialog-sub">{{ message }}</p>

        <!-- Item highlight -->
        <div class="item-info" *ngIf="itemName">
          <i class="fas fa-user"></i>
          <strong>{{ itemName }}</strong>
        </div>

        <!-- Warning strip -->
        <div class="confirm-dialog-warning">
          <i class="fas fa-info-circle"></i>
          <span>This action cannot be undone!</span>
        </div>

        <!-- Actions -->
        <div class="confirm-dialog-actions">
          <button class="confirm-cancel-btn" (click)="onCancel()">
            <i class="fas fa-times"></i> {{ cancelText }}
          </button>
          <button class="confirm-ok-btn" (click)="onConfirm()" [disabled]="loading">
            <i [class]="loading ? 'fas fa-spinner fa-spin' : 'fas fa-trash'"></i>
            {{ loading ? 'Deleting...' : confirmText }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /*
      All modal chrome (overlay, card, icon, title, message, buttons)
      comes from global.css confirm-dialog classes (lines 1013–1178).
      Only component-specific extras are defined here.
    */

    /* z-index: sits above admin panel (adp-confirm-overlay → global.css line 1028) */
    .adp-confirm-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10500;
    }

    /* Item highlight box — specific to delete dialog */
    .item-info {
      background: var(--gray-50);
      border: 2px solid var(--gray-200);
      border-radius: var(--border-radius);
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      width: 100%;
    }

    .item-info i      { color: var(--blue);     font-size: 1.125rem; }
    .item-info strong { color: var(--gray-900); font-size: var(--font-size-sm); }

    /* Warning strip — "This action cannot be undone" */
    .confirm-dialog-warning {
      background: var(--red-light);
      border: 2px solid var(--red);
      border-radius: var(--border-radius);
      padding: 0.625rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      font-size: var(--font-size-xs);
    }

    .confirm-dialog-warning i    { color: var(--red);      font-size: 1rem; }
    .confirm-dialog-warning span { color: var(--red-dark); font-weight: 600; }

    /* Mobile — stack buttons full-width */
    @media (max-width: 480px) {
      .confirm-dialog-actions { flex-direction: column; }
      .confirm-ok-btn,
      .confirm-cancel-btn     { width: 100%; justify-content: center; }
    }
  `]
})
export class DeleteConfirmationComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Confirm Delete';
  @Input() message: string = 'Are you sure you want to delete this item?';
  @Input() itemName?: string;
  @Input() loading: boolean = false;
  @Input() confirmText: string = 'Delete';
  @Input() cancelText: string = 'Cancel';
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}