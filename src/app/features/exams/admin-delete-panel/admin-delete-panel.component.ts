/**
 * AdminDeletePanelComponent
 * ─────────────────────────
 * Visible ONLY for venkatlearning2025@gmail.com.
 *
 * Two operations:
 *   1. Delete Section — wipes all answer sheets for the current
 *      exam filter selection (classId + sectionId + questionPaperId).
 *      e.g. "Class 1 / A / Biology / Mid Term / Midterm7"
 *
 *   2. Delete ALL — wipes every answer sheet for the questionPaperId
 *      regardless of section (all sections at once).
 *
 * Do NOT add upload / evaluation logic here.
 */

import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { StudentUploadStatus } from '../../../core/models/upload-answer-sheet.models';

const SUPER_ADMIN_EMAIL = 'venkatlearning2025@gmail.com';
const INDOWEST_DOMAIN   = 'indowest';

@Component({
  selector: 'app-admin-delete-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-delete-panel.component.html',
  styleUrls: ['./admin-delete-panel.component.css'],
})
export class AdminDeletePanelComponent implements OnChanges {

  // ── Inputs from parent (all from the exam filter selection) ─────────────────
  @Input() students:        StudentUploadStatus[] = [];
  @Input() questionPaperId: number | null = null;
  @Input() classId:         number | null = null;
  @Input() sectionId:       number | null = null;

  // Labels shown in confirm dialogs
  @Input() className:   string = '';
  @Input() sectionName: string = '';
  @Input() paperName:   string = '';

  /** Logged-in user email — from AuthService.getUserEmail() in parent */
  @Input() userEmail: string = '';

  // ── Output ──────────────────────────────────────────────────────────────────
  @Output() studentsChanged = new EventEmitter<StudentUploadStatus[]>();

  // ── Services ────────────────────────────────────────────────────────────────
  private svc          = inject(UploadAnswerSheetService);
  private toast        = inject(ToastService);
  private errorHandler = inject(ErrorHandlerService);

  // ── Gate ────────────────────────────────────────────────────────────────────
  isSuperAdmin = false;   // venkatlearning2025@gmail.com — sees both buttons
  isIndowest   = false;   // *indowest* emails          — sees Delete Section only

  // ── UI state ────────────────────────────────────────────────────────────────
  isDeletingSection = false;
  isDeletingAll     = false;

  // ── Confirm dialog ──────────────────────────────────────────────────────────
  confirmDialog: { lines: string[]; onConfirm: () => void; okLabel: string } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userEmail']) {
      const email = (this.userEmail ?? '').trim().toLowerCase();
      this.isSuperAdmin = email === SUPER_ADMIN_EMAIL;
      this.isIndowest   = !this.isSuperAdmin && email.includes(INDOWEST_DOMAIN);
    }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  get uploadedCount(): number {
    return this.students.filter(s => s.isUploaded && !s.isAbsent).length;
  }

  get filterLabel(): string {
    return [this.className, this.sectionName, this.paperName]
      .filter(Boolean).join(' / ');
  }

  // ── Confirm helpers ──────────────────────────────────────────────────────────
  private showConfirm(message: string, onConfirm: () => void, okLabel: string): void {
    this.confirmDialog = { lines: message.split('\n'), onConfirm, okLabel };
  }

  confirmOk(): void     { this.confirmDialog?.onConfirm(); this.confirmDialog = null; }
  confirmCancel(): void { this.confirmDialog = null; }

  // ── 1. Delete Section ────────────────────────────────────────────────────────
  deleteSection(): void {
    if (!this.questionPaperId || !this.classId || !this.sectionId) return;
    this.showConfirm(
      `DELETE answer sheets for: ${this.filterLabel}\n` +
      `${this.uploadedCount} uploaded sheet(s) will be permanently removed.\n` +
      `Deletes: StudentAnswerSheet · StudentAnswer · StudentRubric · EvaluationQueue + blobs.\n` +
      `This CANNOT be undone.`,
      () => {
        this.isDeletingSection = true;
        this.svc.deleteBySectionAndPaper(
          this.classId!, this.sectionId!, this.questionPaperId!
        ).subscribe({
          next: (res) => {
            if (res.success) {
              const updated = this.students.map(s => ({
                ...s,
                isUploaded:       false,
                fileName:         undefined,
                answerSheetType:  null as 'PDF' | 'Images' | null,
                imageFileNames:   [] as string[],
                imageBlobPaths:   '',
                evaluationStatus: 'Pending',
              }));
              this.studentsChanged.emit(updated);
              this.toast.showSuccess('Deleted', `Section deleted — ${this.filterLabel}`);
            }
            this.isDeletingSection = false;
          },
          error: (err) => {
            this.isDeletingSection = false;
            this.errorHandler.handle('Failed to delete section answer sheets', err);
          },
        });
      },
      'Yes, Delete Section'
    );
  }

  // ── 2. Delete ALL ────────────────────────────────────────────────────────────
  deleteAll(): void {
    if (!this.questionPaperId) return;
    this.showConfirm(
      `DELETE ALL answer sheets for "${this.paperName}"?\n` +
      `This removes data for EVERY section — not just the current one.\n` +
      `Deletes: StudentAnswerSheet · StudentAnswer · StudentRubric · EvaluationQueue + blobs.\n` +
      `This CANNOT be undone.`,
      () => {
        this.isDeletingAll = true;
        this.svc.deleteAllAnswerSheets(this.questionPaperId!).subscribe({
          next: (res) => {
            if (res.success) {
              const updated = this.students.map(s => ({
                ...s,
                isUploaded:       false,
                fileName:         undefined,
                answerSheetType:  null as 'PDF' | 'Images' | null,
                imageFileNames:   [] as string[],
                imageBlobPaths:   '',
                evaluationStatus: 'Pending',
              }));
              this.studentsChanged.emit(updated);
              this.toast.showSuccess('Deleted', `All sections deleted for "${this.paperName}"`);
            }
            this.isDeletingAll = false;
          },
          error: (err) => {
            this.isDeletingAll = false;
            this.errorHandler.handle('Failed to delete all answer sheets', err);
          },
        });
      },
      'Yes, Delete ALL'
    );
  }
}