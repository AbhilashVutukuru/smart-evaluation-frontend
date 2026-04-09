import { Component, inject, HostListener } from '@angular/core';
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';

import {
  StudentUploadStatus,
  SubmitAllPayload,
} from '../../../core/models/upload-answer-sheet.models';
import { ExamFilterComponent } from '../exam-filter/exam-filter.component';
import { BaseExamFilterComponent } from '../base/base-exam-filter.component';

// ─── Page slot state ──────────────────────────────────────────────────────────
export interface PageSlot {
  pageNumber: number;       // 1-based
  dataUrl:    string | null; // null = not yet captured
  deleted:    boolean;      // true = was captured then removed
}

// ─── Modal state ─────────────────────────────────────────────────────────────
export interface PagePickerModal {
  studentId:  number;
  isUpdate:   boolean;
  pageCount:  number | null;  // null = step 1 (ask count), number = step 2 (show slots)
  slots:      PageSlot[];
  inputCount: number | null;   // bound to the number input in step 1
}

@Component({
  selector: 'app-upload-student-marks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExamFilterComponent],
  templateUrl: './upload-answer-sheet.component.html',
  styleUrls: ['./upload-answer-sheet.component.css'],
})
export class UploadAnswerSheetsComponent extends BaseExamFilterComponent {
  private uploadService = inject(UploadAnswerSheetService);

  // ─── Student data ────────────────────────────────────────────────────────────
  students: StudentUploadStatus[] = [];
  absentStudentIds: number[] = [];

  // ─── UI state ────────────────────────────────────────────────────────────────
  loading = false;
  isViewing = false;
  isSubmittingAll = false;
  isSubmittedForEvaluation = false;

  // ─── Filter collapse ──────────────────────────────────────────────────────────
  isFilterCollapsed = false;

  // ─── Page picker modal ───────────────────────────────────────────────────────
  modal: PagePickerModal | null = null;

  // ─── Upload/Update dropdown menu ─────────────────────────────────────────────
  openMenuId: number | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  toggleMenu(studentId: number): void {
    this.openMenuId = this.openMenuId === studentId ? null : studentId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  // ─── Legacy preview strip (PDF direct upload still uses this) ────────────────
  private capturedImages = new Map<number, string[]>();
  private updateModeStudentIds = new Set<number>();

  // ─── Lightbox ────────────────────────────────────────────────────────────────
  lightboxSrc:      string | null = null;
  lightboxPage      = 0;
  lightboxTotal     = 0;
  lightboxStudentId = 0;
  lightboxIndex     = 0;

  // ─── Stats ───────────────────────────────────────────────────────────────────
  get totalStudents(): number { return this.students.length; }
  get absentCount():   number { return this.students.filter(s => s.isAbsent).length; }
  get uploadedCount(): number { return this.students.filter(s => s.isUploaded).length; }
  get pendingCount():  number { return this.students.filter(s => !s.isUploaded && !s.isAbsent).length; }
  get canEvaluate():  boolean { return this.students.length > 0 && this.students.every(s => s.isUploaded || s.isAbsent); }

  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  /** Called when user clicks the "Images" button */
  openPagePicker(student: StudentUploadStatus, isUpdate: boolean): void {
    this.openMenuId = null;
    this.modal = {
      studentId:  student.studentId,
      isUpdate,
      pageCount:  null,
      slots:      [],
      inputCount: null,
    };
  }

  /** Step 1 → Step 2: user confirmed page count */
  confirmPageCount(): void {
    if (!this.modal) return;
    const n = Math.max(1, Math.min(50, this.modal.inputCount || 1));
    this.modal.pageCount = n;
    this.modal.slots = Array.from({ length: n }, (_, i) => ({
      pageNumber: i + 1,
      dataUrl:    null,
      deleted:    false,
    }));
  }

  /** Triggered by hidden file input for each page slot */
  onSlotImageSelected(event: Event, slot: PageSlot): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      this.toastService.showError('Error', 'Only PNG / JPEG images are supported');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.readFileAsDataUrl(file).then(dataUrl => {
      slot.dataUrl = dataUrl;
      slot.deleted = false;
    });
    (event.target as HTMLInputElement).value = '';
  }

  /** Remove a page from a slot — highlights button red */
  deleteSlotImage(slot: PageSlot): void {
    slot.dataUrl = null;
    slot.deleted = true;
  }

  /** True only when ALL slots have images (none empty, none deleted) */
  get modalAllReady(): boolean {
    if (!this.modal?.slots?.length) return false;
    return this.modal.slots.every(s => s.dataUrl !== null);
  }

  /** Count of filled slots */
  get modalFilledCount(): number {
    return this.modal?.slots.filter(s => s.dataUrl !== null).length ?? 0;
  }

  /** Collect all non-null slot images in order and upload */
  uploadModalImages(): void {
    if (!this.modal) return;
    const student = this.students.find(s => s.studentId === this.modal!.studentId);
    if (!student) return;

    const dataUrls = this.modal.slots
      .filter(s => s.dataUrl !== null)
      .map(s => s.dataUrl as string);

    const isUpdate = this.modal.isUpdate;
    this.closeModal();
    this.convertImagesToPdfAndUpload(dataUrls, student, isUpdate);
  }

  closeModal(): void {
    this.modal = null;
    this.modalPreviewSrc = null;
    this.openMenuId = null;
  }

  // ─── Slot preview lightbox ────────────────────────────────────────────────────
  modalPreviewSrc:   string | null = null;
  modalPreviewPage:  number = 0;
  modalPreviewTotal: number = 0;

  openSlotPreview(slot: PageSlot): void {
    if (!slot.dataUrl || !this.modal) return;
    const filled = this.modal.slots.filter(s => s.dataUrl !== null);
    const idx    = filled.indexOf(slot);
    this.modalPreviewSrc   = slot.dataUrl;
    this.modalPreviewPage  = idx + 1;
    this.modalPreviewTotal = filled.length;
  }

  closeSlotPreview(): void {
    this.modalPreviewSrc = null;
  }

  navSlotPreview(dir: -1 | 1): void {
    if (!this.modal) return;
    const filled = this.modal.slots.filter(s => s.dataUrl !== null);
    const idx    = filled.findIndex(s => s.dataUrl === this.modalPreviewSrc);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= filled.length) return;
    this.modalPreviewSrc  = filled[newIdx].dataUrl;
    this.modalPreviewPage = newIdx + 1;
  }

  // ─── Abstract implementation ──────────────────────────────────────────────────
  protected override clearStudents(): void {
    this.students                 = [];
    this.showStudentsCard         = false;
    this.isSubmittedForEvaluation = false;
    this.absentStudentIds         = [];
    this.noExamPaperFound         = false;
    this.capturedImages.clear();
    this.updateModeStudentIds.clear();
    this.modal           = null;
    this.isFilterCollapsed = false;
  }

  // ─── Filter change overrides ──────────────────────────────────────────────────
  override onClassChange(classId: string): void { this.clearStudents(); super.onClassChange(classId); }
  override onSectionChange(): void { this.clearStudents(); super.onSectionChange(); }
  override onSubjectChange(): void { this.clearStudents(); super.onSubjectChange(); }
  override onExamTypeChange(): void { this.clearStudents(); super.onExamTypeChange(); }
  override onQuestionPaperChange(): void { this.clearStudents(); super.onQuestionPaperChange(); }

  // ─── Show Students ────────────────────────────────────────────────────────────
  showStudents(): void {
    if (!this.validateSelection()) return;

    this.noExamPaperFound         = false;
    this.showStudentsCard         = false;
    this.isSubmittedForEvaluation = false;
    this.absentStudentIds         = [];
    this.students                 = [];
    this.capturedImages.clear();
    this.loading                  = true;

    this.uploadService
      .getStudentsWithUploadStatus(
        +this.selectedClass, +this.selectedSection,
        +this.selectedSubject, +this.selectedExamType,
        this.selectedQuestionPaperId!,
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.isSubmittedForEvaluation = response.data.isEvaluationSubmitted ?? false;
            const rawStudents = response.data.students ?? [];
            if (rawStudents.length > 0) {
              this.students = this.mapStudents(rawStudents);
              this.absentStudentIds = this.students.filter(s => s.isAbsent).map(s => s.studentId);
              this.toastService.showSuccess('Success', 'Students loaded successfully');
              this.isFilterCollapsed = true;
              this.isFilterCollapsed = true;
            } else {
              this.students = [];
            }
            this.showStudentsCard = true;
          }
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.errorHandler.handleHttpError(error, 'Failed to load students', () => {
            this.noExamPaperFound = true;
            this.students         = [];
            this.showStudentsCard = true;
          });
        },
      });
  }

  private mapStudents(raw: unknown[]): StudentUploadStatus[] {
    return raw.map(item => {
      const s = item as Record<string, unknown>;
      return {
        studentId:   s['studentId']  as number,
        rollNumber:  s['rollNumber'] as string,
        studentName: s['studentName'] as string,
        className:   s['className']  as string,
        sectionName: s['sectionName'] as string,
        isAbsent:    (s['isAbsent']  as boolean) ?? false,
        isUploaded:
          typeof s['status'] === 'string' &&
          s['status'].toLowerCase().includes('uploaded') &&
          !s['status'].toLowerCase().includes('not'),
        fileName: (s['fileName'] as string) || (s['documentName'] as string) || '',
      };
    });
  }

  // ─── Desktop: PDF file selection ──────────────────────────────────────────────
  onFileSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file?.type === 'application/pdf') {
      student.answerSheetFile = file;
      isUpdate ? this.updateAnswerSheet(student) : this.uploadAnswerSheet(student);
    } else {
      this.toastService.showError('Error', 'Please select a PDF file');
    }
    (event.target as HTMLInputElement).value = '';
  }

  // ─── Mobile camera (still uses old preview strip) ─────────────────────────────
  onImagesSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) { input.value = ''; return; }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const invalid = files.find(f => !validTypes.includes(f.type));
    if (invalid) {
      this.toastService.showError('Error', 'Only PNG and JPEG images are supported');
      input.value = '';
      return;
    }

    if (isUpdate) { this.updateModeStudentIds.add(student.studentId); }
    else          { this.updateModeStudentIds.delete(student.studentId); }

    Promise.all(files.map(f => this.readFileAsDataUrl(f))).then(dataUrls => {
      const existing = this.capturedImages.get(student.studentId) ?? [];
      this.capturedImages.set(student.studentId, [...existing, ...dataUrls]);
    });

    input.value = '';
  }

  getPreviewImages(studentId: number): string[] {
    return this.capturedImages.get(studentId) ?? [];
  }

  clearPreviewImages(studentId: number): void {
    this.capturedImages.delete(studentId);
    this.updateModeStudentIds.delete(studentId);
  }

  uploadCapturedImages(student: StudentUploadStatus): void {
    const images = this.capturedImages.get(student.studentId);
    if (!images || images.length === 0) return;
    const isUpdate = this.updateModeStudentIds.has(student.studentId);
    this.capturedImages.delete(student.studentId);
    this.updateModeStudentIds.delete(student.studentId);
    this.convertImagesToPdfAndUpload(images, student, isUpdate);
  }

  // ─── Core: images → PDF → upload ─────────────────────────────────────────────
  private async convertImagesToPdfAndUpload(
    dataUrls: string[],
    student: StudentUploadStatus,
    isUpdate: boolean,
  ): Promise<void> {
    student.isUploading = true;
    try {
      const pdfBlob = await this.imagesToPdf(dataUrls, student.studentName);
      const fileName = `${student.studentName.replace(/\s+/g, '_')}.pdf`;
      const pdfFile  = new File([pdfBlob], fileName, { type: 'application/pdf' });
      student.answerSheetFile = pdfFile;
      isUpdate ? this.updateAnswerSheet(student) : this.uploadAnswerSheet(student);
    } catch (err) {
      student.isUploading = false;
      this.toastService.showError('Error', 'Failed to convert images to PDF. Please try again.');
      console.error('Image→PDF conversion error:', err);
    }
  }

  private async imagesToPdf(dataUrls: string[], studentName: string): Promise<Blob> {
    const A4_W_MM = 210;
    const A4_H_MM = 297;
    const MARGIN  = 8;
    const maxW    = A4_W_MM - MARGIN * 2;
    const maxH    = A4_H_MM - MARGIN * 2;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    for (let i = 0; i < dataUrls.length; i++) {
      if (i > 0) doc.addPage();
      const dataUrl  = dataUrls[i];
      const imgProps = doc.getImageProperties(dataUrl);
      const ratio    = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const imgW     = imgProps.width  * ratio;
      const imgH     = imgProps.height * ratio;
      const x        = MARGIN + (maxW - imgW) / 2;
      const y        = MARGIN;
      const fmt      = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, fmt, x, y, imgW, imgH, undefined, 'FAST');
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${studentName} — Page ${i + 1} of ${dataUrls.length}`, A4_W_MM / 2, A4_H_MM - 4, { align: 'center' });
    }
    return doc.output('blob') as Blob;
  }

  // ─── Upload / Update ──────────────────────────────────────────────────────────
  uploadAnswerSheet(student: StudentUploadStatus): void {
    if (!student.answerSheetFile) return;
    student.isUploading = true;
    this.uploadService.uploadStudentAnswer(this.buildFormData(student)).subscribe({
      next: (response) => {
        if (response.success) {
          student.isUploaded = true;
          student.fileName   = student.answerSheetFile?.name;
          this.toastService.showSuccess('Success', `Answer sheet uploaded for ${student.studentName}`);
        }
        student.isUploading = false;
      },
      error: (error) => {
        student.isUploading = false;
        this.errorHandler.handle(`Failed to upload answer sheet for ${student.studentName}`, error);
      },
    });
  }

  updateAnswerSheet(student: StudentUploadStatus): void {
    if (!student.answerSheetFile) {
      this.toastService.showWarning('Warning', 'Please select a file first');
      return;
    }
    student.isUploading = true;
    this.uploadService.updateAnswerSheet(this.buildFormData(student)).subscribe({
      next: (response) => {
        if (response.success) {
          student.isUploaded = true;
          student.fileName   = student.answerSheetFile?.name;
          this.toastService.showSuccess('Success', `Answer sheet updated for ${student.studentName}`);
        }
        student.isUploading = false;
      },
      error: (error) => {
        student.isUploading = false;
        this.errorHandler.handle('Failed to update answer sheet', error);
      },
    });
  }

  private buildFormData(student: StudentUploadStatus): FormData {
    const fd = new FormData();
    fd.append('StudentAnswerSheetFile', student.answerSheetFile!);
    fd.append('StudentId',       student.studentId.toString());
    fd.append('ClassId',         this.selectedClass);
    fd.append('SectionId',       this.selectedSection);
    fd.append('SubjectId',       this.selectedSubject);
    fd.append('ExamTypeId',      this.selectedExamType);
    fd.append('QuestionPaperId', this.selectedQuestionPaperId!.toString());
    return fd;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ─── Toggle Absent ────────────────────────────────────────────────────────────
  toggleAbsent(student: StudentUploadStatus): void {
    student.isAbsent = !student.isAbsent;
    if (student.isAbsent) {
      student.isUploaded      = false;
      student.answerSheetFile = undefined;
      this.capturedImages.delete(student.studentId);
      if (!this.absentStudentIds.includes(student.studentId)) {
        this.absentStudentIds.push(student.studentId);
      }
    } else {
      this.absentStudentIds = this.absentStudentIds.filter(id => id !== student.studentId);
    }
  }

  // ─── Submit All ───────────────────────────────────────────────────────────────
  submitAllStudents(): void {
    if (!this.canEvaluate) {
      this.toastService.showWarning('Warning',
        'Please upload answer sheets for all students or mark them as absent');
      return;
    }
    this.isSubmittingAll = true;
    const payload: SubmitAllPayload = {
      classId:          +this.selectedClass,
      sectionId:        +this.selectedSection,
      subjectId:        +this.selectedSubject,
      examTypeId:       +this.selectedExamType,
      questionPaperId:  this.selectedQuestionPaperId!,
      absentStudentIds: this.absentStudentIds,
    };
    this.uploadService.submitAllStudents(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.isSubmittedForEvaluation = true;
          this.toastService.showSuccess('Success', response.message ?? 'Evaluation started successfully');
          this.isSubmittingAll = false;
        }
      },
      error: (error) => {
        this.isSubmittingAll = false;
        this.errorHandler.handle('Failed to start evaluation', error);
      },
    });
  }

  // ─── View Answer Sheet ────────────────────────────────────────────────────────
  viewAnswerSheet(student: StudentUploadStatus): void {
    this.openAnswerSheet(student.studentId);
  }

  // ─── Delete preview image ─────────────────────────────────────────────────────
  deletePreviewImage(studentId: number, index: number): void {
    const images = this.capturedImages.get(studentId);
    if (!images) return;
    images.splice(index, 1);
    if (images.length === 0) {
      this.capturedImages.delete(studentId);
      this.updateModeStudentIds.delete(studentId);
    } else {
      this.capturedImages.set(studentId, [...images]);
    }
    if (this.lightboxStudentId === studentId) {
      if (images.length === 0) { this.closeLightbox(); }
      else {
        const newIdx = Math.min(this.lightboxIndex, images.length - 1);
        this.lightboxIndex = newIdx;
        this.lightboxSrc   = images[newIdx];
        this.lightboxPage  = newIdx + 1;
        this.lightboxTotal = images.length;
      }
    }
  }

  // ─── Lightbox ─────────────────────────────────────────────────────────────────
  openLightbox(studentId: number, index: number): void {
    const images = this.capturedImages.get(studentId);
    if (!images || images.length === 0) return;
    this.lightboxStudentId = studentId;
    this.lightboxIndex     = index;
    this.lightboxSrc       = images[index];
    this.lightboxPage      = index + 1;
    this.lightboxTotal     = images.length;
    document.body.style.overflow = 'hidden';
  }

  lightboxNav(direction: -1 | 1): void {
    const images = this.capturedImages.get(this.lightboxStudentId);
    if (!images) return;
    const newIdx = this.lightboxIndex + direction;
    if (newIdx < 0 || newIdx >= images.length) return;
    this.lightboxIndex = newIdx;
    this.lightboxSrc   = images[newIdx];
    this.lightboxPage  = newIdx + 1;
  }

  closeLightbox(): void {
    this.lightboxSrc       = null;
    this.lightboxStudentId = 0;
    this.lightboxIndex     = 0;
    this.lightboxPage      = 0;
    document.body.style.overflow = '';
  }
}