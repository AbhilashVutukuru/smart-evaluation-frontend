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
              <i class="fas fa-times"></i>
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
    /*
      Removed (already in global.css):
        .btn, .btn:disabled                → global.css lines 285–301
        .btn-primary + hover               → global.css lines 310–325
        .btn-secondary (gray) + hover      → global.css lines 328–329
        .btn-danger + hover                → global.css lines 337–338
        @keyframes fadeIn                  → global.css line 731
      Removed (already in styles.css):
        all hardcoded hex colours          → replaced with CSS variables
    */

    /* ── Overlay ─────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--overlay-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;        /* @keyframes fadeIn → global.css */
    }

    /* ── Modal Container ─────────────────────────────────────── */
    .modal-container {
      background: var(--app-bg);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-md);
      max-width: 480px;
      width: 90%;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .modal-content { padding: 24px; }

    /* ── Header ──────────────────────────────────────────────── */
    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    /* Icon circle — coloured per type */
    .icon-circle {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .icon-circle.danger  { background: var(--red-light);    color: var(--red);        border: 2px solid var(--red); }
    .icon-circle.warning { background: var(--yellow-light); color: var(--yellow);     border: 2px solid var(--yellow); }
    .icon-circle.info    { background: var(--blue-light);   color: var(--blue);       border: 2px solid var(--blue); }
    .icon-circle.success { background: var(--green-light);  color: var(--green-dark); border: 2px solid var(--green); }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--gray-900);
      text-align: center;
    }

    /* ── Body ────────────────────────────────────────────────── */
    .modal-body { margin-bottom: 24px; }

    .modal-message {
      text-align: center;
      color: var(--gray-500);
      font-size: var(--font-size-sm);
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    /* Detail key-value box */
    .detail-box {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: var(--border-radius);
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--gray-200);
    }

    .detail-row:last-child { border-bottom: none; padding-bottom: 0; }

    .detail-label { color: var(--gray-500); font-weight: 500;  font-size: var(--font-size-xs); }
    .detail-value { color: var(--gray-900); font-weight: 600;  font-size: var(--font-size-xs); }

    /* Warning callout — mirrors .warning-box from global.css */
    .warning-box {
      background: var(--yellow-light);
      border: 1px solid var(--yellow);
      border-radius: var(--border-radius);
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--font-size-xs);
      color: var(--yellow-dark);
    }

    .warning-box i { color: var(--yellow); font-size: 18px; }

    /* ── Footer ──────────────────────────────────────────────── */
    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /*
      .btn, .btn:disabled  → global.css
      .btn-primary + hover → global.css
      .btn-danger  + hover → global.css

      Design decision: Cancel uses green (overrides global gray .btn-secondary)
    */
    .btn-secondary {
      background: var(--green) !important;
      color: var(--white) !important;
      border: 2px solid var(--green) !important;
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--green-dark) !important;
      border-color: var(--green-dark) !important;
      transform: translateY(-2px);
      box-shadow: var(--shadow-green) !important;
    }

    /* Warning button — no global equivalent, defined locally */
    .btn-warning {
      background: var(--yellow);
      color: var(--white);
      border: none;
    }

    .btn-warning:hover:not(:disabled) {
      background: var(--yellow-dark);
      transform: translateY(-2px);
      box-shadow: var(--shadow-yellow);
    }

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 576px) {
      .modal-container { margin: 20px; }

      .modal-footer { flex-direction: column-reverse; }

      .btn { width: 100%; justify-content: center; }
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