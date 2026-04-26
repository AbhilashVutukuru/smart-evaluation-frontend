import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cancel-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="show" (click)="onNo()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="modal-close" (click)="onNo()" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="modal-header">
          <div class="icon-warning">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <h3>{{ title }}</h3>
        </div>
        
        <div class="modal-body">
          <p>{{ message }}</p>
          <div class="warning-message">
            <i class="fas fa-info-circle"></i>
            <span>All unsaved changes will be lost!</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onNo()">
            <i class="fas fa-times"></i> No, Continue Editing
          </button>
          <button class="btn btn-danger" (click)="onYes()">
            <i class="fas fa-check"></i> Yes, Discard Changes
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /*
      .btn, .btn-secondary, .btn-danger  → global.css
      @keyframes fadeIn                  → global.css
      CSS variables                      → styles.css
    */

    /* ── Overlay ─────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--overlay-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;        /* keyframe lives in global.css */
    }

    /* ── Modal Card ──────────────────────────────────────────── */
    .modal-content {
      background: var(--app-bg);
      border-radius: var(--border-radius-lg);
      width: 90%;
      max-width: 500px;
      box-shadow: var(--shadow-md);
      animation: slideUp 0.3s ease;
      position: relative;
    }

    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* ── Close Button ────────────────────────────────────────── */
    .modal-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--gray-500);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: var(--transition);
      z-index: 1;
    }

    .modal-close:hover {
      background: var(--gray-100);
      color: var(--gray-900);
    }

    /* ── Header ──────────────────────────────────────────────── */
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
      background: var(--yellow-light);
      border: 3px solid var(--yellow);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.05); }
    }

    .icon-warning i {
      font-size: 28px;
      color: var(--yellow);
    }

    .modal-header h3 {
      margin: 0;
      color: var(--gray-900);
      font-size: 24px;
      font-weight: 700;
    }

    /* ── Body ────────────────────────────────────────────────── */
    .modal-body {
      padding: 15px 30px 25px;
      text-align: center;
    }

    .modal-body p {
      color: var(--gray-700);
      font-size: var(--font-size-sm);
      line-height: 1.6;
      margin: 0 0 20px;
    }

    /* reuses .error-box pattern from global.css */
    .warning-message {
      background: var(--red-light);
      border: 2px solid var(--red);
      border-radius: var(--border-radius);
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .warning-message i    { color: var(--red);      font-size: 16px; }
    .warning-message span { color: var(--red-dark); font-weight: 600; font-size: var(--font-size-xs); }

    /* ── Footer ──────────────────────────────────────────────── */
    .modal-footer {
      padding: 20px 30px 30px;
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    /*
      .btn            → global.css  (base styles, padding, border-radius, transition)
      .btn-secondary  → global.css  (gray bg, hover state)
      .btn-danger     → global.css  (red bg, hover + shadow)
      No local overrides needed — global definitions match the design exactly.
    */

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .modal-content  { margin: 20px; }

      .modal-header {
        padding: 25px 20px 15px;
        flex-direction: column;
        gap: 10px;
      }

      .icon-warning   { width: 50px; height: 50px; }
      .icon-warning i { font-size: 24px; }
      .modal-header h3{ font-size: 20px; }
      .modal-body     { padding: 10px 20px 20px; }

      .modal-footer {
        padding: 15px 20px 25px;
        flex-direction: column;
      }

      .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class CancelConfirmationComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Unsaved Changes';
  @Input() message: string = 'Are you sure you want to cancel? All unsaved changes will be lost.';
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onYes(): void {
    this.confirmed.emit();
  }

  onNo(): void {
    this.cancelled.emit();
  }
}