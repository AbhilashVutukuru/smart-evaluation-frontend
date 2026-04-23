import { Component, inject, HostListener, OnDestroy } from '@angular/core';
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';
import { PageContextService } from '../../../core/services/page-context.service';

import {
  StudentUploadStatus,
  SubmitAllPayload,
  ImagePreviewSlot,
  ImagePreviewModal,
} from '../../../core/models/upload-answer-sheet.models';
import { ExamFilterComponent } from '../exam-filter/exam-filter.component';
import { BaseExamFilterComponent } from '../base/base-exam-filter.component';

// ─── Page slot state ──────────────────────────────────────────────────────────
export interface PageSlot {
  pageNumber: number;
  dataUrl:    string | null;
  deleted:    boolean;
  imageFile:  File | null;   // original File object for backend upload
}

// ─── Modal state ──────────────────────────────────────────────────────────────
export interface PagePickerModal {
  studentId:  number;
  isUpdate:   boolean;
  pageCount:  number | null;  // null = step 1 (ask count), number = step 2 (show slots)
  slots:      PageSlot[];
  inputCount: number | null;  // bound to the number input in step 1
}

@Component({
  selector: 'app-upload-student-marks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExamFilterComponent],
  templateUrl: './upload-answer-sheet.component.html',
  styleUrls: ['./upload-answer-sheet.component.css'],
})
export class UploadAnswerSheetsComponent extends BaseExamFilterComponent implements OnDestroy {
  private uploadService    = inject(UploadAnswerSheetService);
  private pageContext      = inject(PageContextService);

  // ─── Student data ─────────────────────────────────────────────────────────────
  students: StudentUploadStatus[] = [];
  absentStudentIds: number[] = [];

  // ─── UI state ─────────────────────────────────────────────────────────────────
  loading = false;
  isViewing = false;
  isSubmittingAll = false;
  isSubmittedForEvaluation = false;
  submittedAt: Date | null = null;        // timestamp shown next to header after submit

  // ─── Filter collapse ──────────────────────────────────────────────────────────
  isFilterCollapsed = false;
  hasSearched       = false;

  // ─── Table search ─────────────────────────────────────────────────────────────
  searchTerm        = '';
  filteredStudents: StudentUploadStatus[] = [];

  // ─── Page picker modal ────────────────────────────────────────────────────────
  modal: PagePickerModal | null = null;

  // ─── Image preview & per-slot replace modal ───────────────────────────────────
  imagePreviewModal: ImagePreviewModal | null = null;

  // ─── Image preview lightbox ───────────────────────────────────────────────────
  previewLightboxSrc:   string | null = null;
  previewLightboxIndex: number = 0;
  previewLightboxTotal: number = 0;

  openPreviewLightbox(slot: ImagePreviewSlot): void {
    if (!this.imagePreviewModal) return;
    const src = slot.newPreviewUrl ?? slot.previewUrl;
    if (!src) return;
    this.previewLightboxSrc   = src;
    this.previewLightboxIndex = slot.index;
    this.previewLightboxTotal = this.imagePreviewModal.slots.length;
  }

  closePreviewLightbox(): void {
    this.previewLightboxSrc = null;
  }

  navPreviewLightbox(dir: -1 | 1): void {
    if (!this.imagePreviewModal) return;
    const newIdx = this.previewLightboxIndex + dir;
    if (newIdx < 0 || newIdx >= this.imagePreviewModal.slots.length) return;
    const slot = this.imagePreviewModal.slots[newIdx];
    this.previewLightboxSrc   = slot.newPreviewUrl ?? slot.previewUrl ?? null;
    this.previewLightboxIndex = newIdx;
  }

  // ─── Upload/Update dropdown menu ──────────────────────────────────────────────
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

  // ─── Table search ─────────────────────────────────────────────────────────────
  onSearchInput(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredStudents = [...this.students];
      return;
    }
    this.filteredStudents = this.students.filter(s =>
      s.studentName?.toLowerCase().includes(term) ||
      s.rollNumber?.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm       = '';
    this.filteredStudents = [...this.students];
  }

  // ─── Legacy preview strip (PDF direct upload still uses this) ─────────────────
  private capturedImages     = new Map<number, string[]>();
  private capturedImageFiles = new Map<number, File[]>();   // original Files for backend
  private updateModeStudentIds = new Set<number>();

  // ─── Lightbox ─────────────────────────────────────────────────────────────────
  lightboxSrc:      string | null = null;
  lightboxPage      = 0;
  lightboxTotal     = 0;
  lightboxStudentId = 0;
  lightboxIndex     = 0;

  // ─── Stats ────────────────────────────────────────────────────────────────────
  get totalStudents(): number { return this.students.length; }
  get absentCount():   number { return this.students.filter(s => s.isAbsent).length; }
  get uploadedCount(): number { return this.students.filter(s => s.isUploaded).length; }
  get pendingCount():  number { return this.students.filter(s => !s.isUploaded && !s.isAbsent).length; }
  get canEvaluate():  boolean { return this.students.length > 0 && this.students.every(s => s.isUploaded || s.isAbsent); }

  /** True when the image preview modal has at least one replaced or new slot */
  get hasReplacedImages(): boolean {
    return this.imagePreviewModal?.slots.some(s => s.isReplaced || s.isNew) ?? false;
  }

  /** Count of replaced + new slots in the image preview modal */
  get replacedImageCount(): number {
    return this.imagePreviewModal?.slots.filter(s => s.isReplaced || s.isNew).length ?? 0;
  }

  /** Count of replaced (existing) slots */
  get replacedCount(): number {
    return this.imagePreviewModal?.slots.filter(s => s.isReplaced).length ?? 0;
  }

  /** Count of newly added slots */
  get newCount(): number {
    return this.imagePreviewModal?.slots.filter(s => s.isNew).length ?? 0;
  }

  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Modal helpers ────────────────────────────────────────────────────────────

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
      imageFile:  null,
    }));
  }

  /** Instant slot generation as user types page count — no Continue button needed */
  onPageCountInput(): void {
    if (!this.modal) return;
    const n = Math.max(1, Math.min(50, this.modal.inputCount || 0));
    if (n < 1) {
      this.modal.pageCount = null;
      this.modal.slots     = [];
      return;
    }
    this.modal.pageCount = n;
    // Preserve existing slot data when count changes
    const existing = this.modal.slots;
    this.modal.slots = Array.from({ length: n }, (_, i) => ({
      pageNumber: i + 1,
      dataUrl:    existing[i]?.dataUrl    ?? null,
      deleted:    existing[i]?.deleted    ?? false,
      imageFile:  existing[i]?.imageFile  ?? null,
    }));
  }

  // ─── Confirm Dialog ──────────────────────────────────────────────────────────
  confirmDialog: { lines: string[]; onConfirm: () => void; okLabel?: string } | null = null;

  showConfirmDialog(message: string, onConfirm: () => void, okLabel = 'Yes, Reset'): void {
    this.confirmDialog = { lines: message.split('\n'), onConfirm, okLabel };
  }

  confirmDialogOk(): void {
    this.confirmDialog?.onConfirm();
    this.confirmDialog = null;
  }

  confirmDialogCancel(): void {
    this.confirmDialog = null;
  }

  /** Resets all slots and page count — re-enables count input, shows warning */
  resetModalSlots(): void {
    if (!this.modal) return;
    const hasImages = this.modalFilledCount > 0;
    const message = hasImages
      ? `This will reset the page count to zero, and all your changes will be discarded. Are you sure to continue?`
      : `This will reset the page count to zero, and all your changes will be discarded. Are you sure to continue?`;
    this.showConfirmDialog(message, () => {
      this.modal!.slots      = [];
      this.modal!.pageCount  = null;
      this.modal!.inputCount = null;
      if (hasImages) {
        this.toastService.showWarning('Reset', 'All uploaded images cleared. Please re-enter the page count.');
      }
    });
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
      slot.dataUrl   = dataUrl;
      slot.deleted   = false;
      slot.imageFile = file;   // store original File for backend upload
    });
    (event.target as HTMLInputElement).value = '';
  }

  /** Remove a page from a slot — highlights button red */
  deleteSlotImage(slot: PageSlot): void {
    slot.dataUrl   = null;
    slot.deleted   = true;
    slot.imageFile = null;
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

    const dataUrls   = this.modal.slots.filter(s => s.dataUrl !== null).map(s => s.dataUrl as string);
    const imageFiles = this.modal.slots.filter(s => s.imageFile !== null).map(s => s.imageFile as File);
    const isUpdate   = this.modal.isUpdate;
    this.closeModal();
    this.convertImagesToPdfAndUpload(dataUrls, student, isUpdate, imageFiles);
  }

  closeModal(): void {
    this.modal = null;
    this.modalPreviewSrc = null;
    this.openMenuId = null;
  }

  // ─── Image Preview Modal ──────────────────────────────────────────────────────

  /** Opens the image preview modal and loads thumbnails from blob */
  openImagePreview(student: StudentUploadStatus): void {
    // Prefer imageFileNames (set locally after upload) over fileName from DB
    // because fileName may be stale (old PDF name) before page reload
    let fileNames: string[] = [];

    if (student.imageFileNames?.length) {
      // Just uploaded — use local names
      fileNames = student.imageFileNames;
    } else if (student.fileName?.includes('|')) {
      // Loaded from API — pipe-separated original names
      fileNames = student.fileName.split('|').filter(f => f);
    } else if (student.fileName && !student.fileName.endsWith('.pdf')) {
      // Single image name
      fileNames = [student.fileName];
    }

    const blobPaths = student.imageBlobPaths?.split('|').filter(p => p) ?? [];

    const slots: ImagePreviewSlot[] = fileNames.map((name, i) => ({
      index:            i,
      fileName:         name,
      blobPath:         blobPaths[i] ?? '',
      previewUrl:       null,
      newFile:          null,
      newPreviewUrl:    null,
      isLoadingPreview: true,
      isReplaced:       false,
      isNew:            false,   // existing uploaded image
    }));

    this.imagePreviewModal = {
      studentId:   student.studentId,
      studentName: student.studentName,
      slots,
      isSaving:    false,
    };

    // Load each image thumbnail from blob in parallel.
    // The cacheBust timestamp forces the browser to bypass its HTTP cache,
    // so re-opening the modal after a replacement always shows the new image.
    const cacheBust = Date.now();
    slots.forEach((slot, i) => {
      this.uploadService.downloadImage(
        student.studentId, i, this.selectedQuestionPaperId!, cacheBust
      ).subscribe({
        next: (dataUrl) => {
          slot.previewUrl       = dataUrl;
          slot.isLoadingPreview = false;
        },
        error: () => {
          slot.isLoadingPreview = false; // show placeholder on error
        },
      });
    });
  }

  closeImagePreview(): void {
    this.imagePreviewModal    = null;
    this.previewLightboxSrc   = null;
    this.previewLightboxIndex = 0;
  }

  /** Resets all replacements — restores original images without closing modal */
  resetImagePreview(): void {
    if (!this.imagePreviewModal) return;
    this.imagePreviewModal.slots.forEach(slot => {
      slot.isReplaced    = false;
      slot.newFile       = null;
      slot.newPreviewUrl = null;
    });
    this.toastService.showWarning('Reset', 'All replacements cleared.');
  }

  /** Re-upload all images fresh — confirms then opens page picker */
  reuploadImages(): void {
    if (!this.imagePreviewModal) return;
    const studentId = this.imagePreviewModal.studentId;
    this.showConfirmDialog(
      'All existing images will be replaced with a fresh upload. You will need to re-upload all pages. Are you sure?',
      () => {
        const student = this.students.find(s => s.studentId === studentId);
        if (!student) return;
        this.closeImagePreview();
        // Open page picker in update mode — fresh upload
        this.openPagePicker(student, true);
      }
    );
  }

  /** Adds more images as new slots to the existing image preview modal */
  onAddMoreImages(event: Event): void {
    if (!this.imagePreviewModal) return;
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const invalid = files.find(f => !validTypes.includes(f.type));
    if (invalid) {
      this.toastService.showError('Error', 'Only PNG / JPEG / WebP images are supported');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const currentCount = this.imagePreviewModal.slots.length;

    files.forEach((file, i) => {
      this.readFileAsDataUrl(file).then(dataUrl => {
        this.imagePreviewModal?.slots.push({
          index:            currentCount + i,
          fileName:         file.name,
          blobPath:         '',
          previewUrl:       null,
          newFile:          file,
          newPreviewUrl:    dataUrl,
          isLoadingPreview: false,
          isReplaced:       false,  // not a replacement
          isNew:            true,   // brand new addition
        });
      });
    });

    (event.target as HTMLInputElement).value = '';
  }

  /** Removes a newly added slot (not an existing image) */
  removeNewSlot(slot: ImagePreviewSlot): void {
    if (!this.imagePreviewModal || !slot.isNew) return;
    const idx = this.imagePreviewModal.slots.indexOf(slot);
    if (idx > -1) {
      this.imagePreviewModal.slots.splice(idx, 1);
      // Re-index remaining slots
      this.imagePreviewModal.slots.forEach((s, i) => s.index = i);
    }
  }

  /** User picks a replacement image for a specific slot */
  onReplaceImageSelected(event: Event, slot: ImagePreviewSlot): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      this.toastService.showError('Error', 'Only image files are supported');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.readFileAsDataUrl(file).then(dataUrl => {
      slot.newFile         = file;
      slot.newPreviewUrl   = dataUrl;
      slot.isReplaced      = true;
    });
    (event.target as HTMLInputElement).value = '';
  }

  /** Saves all replaced images — only changed slots re-uploaded, then PDF regenerated */
  async saveImageReplacements(): Promise<void> {
    if (!this.imagePreviewModal) return;
    const modal   = this.imagePreviewModal;
    const changed = modal.slots.filter(s => (s.isReplaced || s.isNew) && s.newFile);
    if (!changed.length) {
      this.toastService.showWarning('Warning', 'No images were replaced');
      return;
    }

    modal.isSaving = true;
    const student  = this.students.find(s => s.studentId === modal.studentId);

    try {
      // ── Step 1: Process each changed slot ────────────────────────────
      // New slots (blobPath empty) → use SlotIndex = -1 to signal append
      // Existing slots (blobPath set) → replace at SlotIndex
      for (const slot of changed) {
        const fd = new FormData();
        fd.append('NewImageFile',    slot.newFile!);
        fd.append('StudentId',       modal.studentId.toString());
        fd.append('ClassId',         this.selectedClass);
        fd.append('SectionId',       this.selectedSection);
        fd.append('SubjectId',       this.selectedSubject);
        fd.append('ExamTypeId',      this.selectedExamType);
        fd.append('QuestionPaperId', this.selectedQuestionPaperId!.toString());
        // SlotIndex: use actual index for replace, -1 for new append
        fd.append('SlotIndex', slot.isNew ? '-1' : slot.index.toString());
        fd.append('OldBlobPath',     slot.blobPath ?? '');

        await this.uploadService.replaceImage(fd).toPromise();

        // Update local slot state
        slot.fileName         = slot.newFile!.name;
        slot.previewUrl       = slot.newPreviewUrl;  // save before clearing
        slot.isReplaced       = false;
        slot.isNew            = false;
        slot.newFile          = null;
        slot.newPreviewUrl    = null;
      }

      // ── Step 2: Collect all current image dataUrls ────────────────────
      // Changed slots already have data: URLs in previewUrl (set above).
      // Unchanged slots have an http:// blob URL — jsPDF cannot use those.
      // Fetch unchanged slots as data: URLs now before building the PDF.
      const cacheBust = Date.now();
      const allDataUrls: string[] = await Promise.all(
        modal.slots.map(async (s, i) => {
          if (!s.previewUrl) return '';
          // If it's already a data: URL (just replaced), use it directly
          if (s.previewUrl.startsWith('data:')) return s.previewUrl;
          // Otherwise fetch from API and convert to data: URL
          try {
            return await this.uploadService.downloadImage(
              modal.studentId, i, this.selectedQuestionPaperId!, cacheBust
            ).toPromise() as string;
          } catch {
            return '';
          }
        })
      );

      const validDataUrls = allDataUrls.filter(u => u.length > 0);

      // ── Step 3: Regenerate PDF and update BlobPath only ──────────────
      if (validDataUrls.length > 0 && student) {
        const pdfBlob = await this.imagesToPdf(validDataUrls, student.studentName);
        const pdfFileName = `${student.studentName.replace(/\s+/g, '_')}.pdf`;
        const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

        // Use SlotIndex = -2 → signals backend to update BlobPath only
        // FileName and ImageBlobPaths are NOT touched
        const pdfFd = new FormData();
        pdfFd.append('NewImageFile',    pdfFile);
        pdfFd.append('StudentId',       modal.studentId.toString());
        pdfFd.append('ClassId',         this.selectedClass);
        pdfFd.append('SectionId',       this.selectedSection);
        pdfFd.append('SubjectId',       this.selectedSubject);
        pdfFd.append('ExamTypeId',      this.selectedExamType);
        pdfFd.append('QuestionPaperId', this.selectedQuestionPaperId!.toString());
        pdfFd.append('SlotIndex',       '-2');  // PDF-only update signal

        await this.uploadService.replaceImage(pdfFd).toPromise();
      }

      // ── Step 4: Reload students from server — ensures UI matches DB ──
      this.toastService.showSuccess('Success', 'Images updated successfully');
      this.closeImagePreview();
      this.showStudents();   // full reload — correct answerSheetType, fileName, imageBlobPaths
    } catch (err) {
      this.errorHandler.handle('Failed to replace image', err);
    } finally {
      modal.isSaving = false;
    }
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
    this.filteredStudents         = [];
    this.searchTerm               = '';
    this.showStudentsCard         = false;
    this.isSubmittedForEvaluation = false;
    this.submittedAt              = null;
    this.absentStudentIds         = [];
    this.noExamPaperFound         = false;
    this.capturedImages.clear();
    this.capturedImageFiles.clear();
    this.updateModeStudentIds.clear();
    this.modal           = null;
    this.isFilterCollapsed = false;
    this.hasSearched       = false;
  }

  // ─── Filter change overrides ──────────────────────────────────────────────────
  override onClassChange(classId: string): void { this.clearStudents(); super.onClassChange(classId); }
  override onSectionChange(): void               { this.clearStudents(); super.onSectionChange(); }
  override onSubjectChange(): void               { this.clearStudents(); super.onSubjectChange(); }
  override onExamTypeChange(): void              { this.clearStudents(); super.onExamTypeChange(); }
  override onQuestionPaperChange(): void         { this.clearStudents(); super.onQuestionPaperChange(); }

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
            // Use submittedAt from API (EvaluationQueue.CreatedDate) if already submitted
            if (response.data.submittedAt) {
              this.submittedAt = this.parseUtcDate(response.data.submittedAt);
            }
            // Update topbar subtitle
            if (this.isSubmittedForEvaluation && this.submittedAt) {
              this.pageContext.setSubtitle(`Submitted for evaluation on ${this.getSubmittedAtDisplay()}`);
            } else {
              this.pageContext.clearSubtitle();
            }
            const rawStudents = response.data.students ?? [];
            if (rawStudents.length > 0) {
              this.students         = this.mapStudents(rawStudents);
              this.filteredStudents = [...this.students];
              this.absentStudentIds = this.students.filter(s => s.isAbsent).map(s => s.studentId);
              //this.toastService.showSuccess('Success', 'Students loaded successfully');
              // Unlock collapse toggle and auto-collapse the filter card
              this.hasSearched       = true;
              this.isFilterCollapsed = true;
            } else {
              this.students         = [];
              this.filteredStudents = [];
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
      const isUploaded =
        typeof s['status'] === 'string' &&
        s['status'].toLowerCase().includes('uploaded') &&
        !s['status'].toLowerCase().includes('not');
      return {
        studentId:        s['studentId']        as number,
        rollNumber:       s['rollNumber']        as string,
        studentName:      s['studentName']       as string,
        className:        s['className']         as string,
        sectionName:      s['sectionName']       as string,
        isAbsent:         (s['isAbsent']         as boolean) ?? false,
        isUploaded,
        fileName:         (s['fileName']         as string) || (s['documentName'] as string) || '',
        answerSheetType:  (s['answerSheetType']  as 'PDF' | 'Images' | null) ?? null,
        // Auto-split pipe-separated fileName into imageFileNames for Images type
        imageFileNames:   (() => {
          const fn = s['fileName'] as string;
          if ((s['answerSheetType'] as string) === 'Images' && fn?.includes('|')) {
            return fn.split('|').filter(f => f);
          }
          return [];
        })(),
        evaluationStatus: (s['evaluationStatus'] as string) ?? 'Pending',
        imageBlobPaths:   (s['imageBlobPaths']   as string) ?? '',
      };
    });
  }

  // ─── Desktop: PDF file selection ──────────────────────────────────────────────
  onFileSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file?.type === 'application/pdf') {
      student.answerSheetFile = file;
      student.answerSheetType = 'PDF';
      student.imageFileNames  = [];
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
      const existing      = this.capturedImages.get(student.studentId) ?? [];
      const existingFiles = this.capturedImageFiles.get(student.studentId) ?? [];
      this.capturedImages.set(student.studentId, [...existing, ...dataUrls]);
      this.capturedImageFiles.set(student.studentId, [...existingFiles, ...files]);
    });

    input.value = '';
  }

  getPreviewImages(studentId: number): string[] {
    return this.capturedImages.get(studentId) ?? [];
  }

  clearPreviewImages(studentId: number): void {
    this.capturedImages.delete(studentId);
    this.capturedImageFiles.delete(studentId);
    this.updateModeStudentIds.delete(studentId);
  }

  uploadCapturedImages(student: StudentUploadStatus): void {
    const images     = this.capturedImages.get(student.studentId);
    const imageFiles = this.capturedImageFiles.get(student.studentId);
    if (!images || images.length === 0) return;
    const isUpdate = this.updateModeStudentIds.has(student.studentId);
    this.capturedImages.delete(student.studentId);
    this.capturedImageFiles.delete(student.studentId);
    this.updateModeStudentIds.delete(student.studentId);
    this.convertImagesToPdfAndUpload(images, student, isUpdate, imageFiles ?? []);
  }

  // ─── Core: images → PDF → upload ─────────────────────────────────────────────
  private async convertImagesToPdfAndUpload(
    dataUrls: string[],
    student: StudentUploadStatus,
    isUpdate: boolean,
    imageFiles?: File[],   // original File objects to send to backend
  ): Promise<void> {
    student.isUploading = true;
    try {
      const pdfBlob = await this.imagesToPdf(dataUrls, student.studentName);
      const fileName = `${student.studentName.replace(/\s+/g, '_')}.pdf`;
      const pdfFile  = new File([pdfBlob], fileName, { type: 'application/pdf' });
      student.answerSheetFile  = pdfFile;
      student.answerSheetType  = 'Images';
      // Store original filenames for display and for DB FileName column
      student.imageFileNames   = (imageFiles ?? []).map(f => f.name);
      student.imageFiles       = imageFiles ?? [];
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
          student.isUploaded       = true;
          student.fileName         = student.answerSheetFile?.name;
          student.answerSheetType  = student.answerSheetType ?? 'PDF'; // preserve if Images already set
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
          student.isUploaded       = true;
          student.fileName         = student.answerSheetFile?.name;
          student.answerSheetType  = student.answerSheetType ?? 'PDF';
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
    fd.append('StudentId',        student.studentId.toString());
    fd.append('ClassId',          this.selectedClass);
    fd.append('SectionId',        this.selectedSection);
    fd.append('SubjectId',        this.selectedSubject);
    fd.append('ExamTypeId',       this.selectedExamType);
    fd.append('QuestionPaperId',  this.selectedQuestionPaperId!.toString());
    fd.append('AnswerSheetType',  student.answerSheetType ?? 'PDF');
    // Send individual image files when type is Images
    if (student.answerSheetType === 'Images' && student.imageFiles?.length) {
      student.imageFiles.forEach(f => fd.append('ImageFiles', f));
    }
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

  // ─── Remove Answer Sheet ─────────────────────────────────────────────────────
  removeAnswerSheet(student: StudentUploadStatus): void {
    this.showConfirmDialog(
      `Are you sure you want to remove the uploaded answer sheet for ${student.studentName}?\nThis will delete the answer sheet and all related data.\nThe student can then either be marked as absent or have the answer sheet re-uploaded.`,
      () => {
        student.isUploading = true;
        this.uploadService.deleteAnswerSheet(student.studentId, this.selectedQuestionPaperId!).subscribe({
          next: (response) => {
            if (response.success) {
              student.isUploaded      = false;
              student.fileName        = undefined;
              student.answerSheetType = null;
              student.imageFileNames  = [];
              student.imageBlobPaths  = '';
              this.toastService.showSuccess('Removed', `Answer sheet removed for ${student.studentName}`);
            }
            student.isUploading = false;
          },
          error: (error) => {
            student.isUploading = false;
            this.errorHandler.handle('Failed to remove answer sheet', error);
          },
        });
      },
      'Yes, Remove'
    );
  }
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
          // Use server UTC timestamp from EvaluationQueue INSERT — not browser time
          this.submittedAt = this.parseUtcDate(response.data?.submittedAt) ?? new Date();
          this.pageContext.setSubtitle(`Submitted for evaluation on ${this.getSubmittedAtDisplay()}`);
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

  // ─── Navigate to View Results (all students) ────────────────────────────────
  viewResults(): void {
    this.router.navigate(['/results'], {
      queryParams: {
        classId:           this.selectedClass,
        sectionId:         this.selectedSection,
        subjectId:         this.selectedSubject,
        examTypeId:        this.selectedExamType,
        questionPaperId:   this.selectedQuestionPaperId,
        // Name strings for immediate chip display (no API calls needed)
        className:         this.getSelectedName(this.classes,       this.selectedClass,    'className'),
        sectionName:       this.getSelectedName(this.sections,      this.selectedSection,  'sectionName'),
        subjectName:       this.getSelectedName(this.subjects,      this.selectedSubject,  'subjectName'),
        examTypeName:      this.getSelectedName(this.examTypes,     this.selectedExamType, 'examTypeName'),
        questionPaperName: this.questionPapers.find(q => q.id === this.selectedQuestionPaperId)?.questionPaperName ?? '',
      },
    });
  }

  // ─── Navigate to View Result for a specific evaluated student ────────────────
  viewStudentResult(student: StudentUploadStatus): void {
    this.router.navigate(['/results'], {
      queryParams: {
        classId:           this.selectedClass,
        sectionId:         this.selectedSection,
        subjectId:         this.selectedSubject,
        examTypeId:        this.selectedExamType,
        questionPaperId:   this.selectedQuestionPaperId,
        studentId:         student.studentId,
        // Name strings for immediate chip display (no API calls needed)
        className:         this.getSelectedName(this.classes,       this.selectedClass,    'className'),
        sectionName:       this.getSelectedName(this.sections,      this.selectedSection,  'sectionName'),
        subjectName:       this.getSelectedName(this.subjects,      this.selectedSubject,  'subjectName'),
        examTypeName:      this.getSelectedName(this.examTypes,     this.selectedExamType, 'examTypeName'),
        questionPaperName: this.questionPapers.find(q => q.id === this.selectedQuestionPaperId)?.questionPaperName ?? '',
      },
    });
  }

  /** Helper — gets display name from a dropdown array by id field */
  private getSelectedName(arr: any[], id: string, nameField: string): string {
    return arr.find(i => String(i.id) === String(id))?.[nameField] ?? '';
  }

  // ─── Format submission timestamp for display ──────────────────────────────────
  getSubmittedAtDisplay(): string {
    if (!this.submittedAt) return '';
    return this.submittedAt.toLocaleString('en-GB', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // ─── Safely parse UTC date string ─────────────────────────────────────────────
  // DB stores datetime2 as "2026-04-15 07:37:48" (no T, no Z).
  // C# JSON serializer may emit "2026-04-15T07:37:48" (no Z).
  // Without Z, new Date() treats it as LOCAL time — wrong.
  // This helper normalises both formats to ISO UTC by ensuring Z suffix.
  private parseUtcDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    // Replace space with T if needed: "2026-04-15 07:37:48" → "2026-04-15T07:37:48"
    const withT = value.replace(' ', 'T');
    // Append Z if missing: "2026-04-15T07:37:48" → "2026-04-15T07:37:48Z"
    const iso   = withT.endsWith('Z') ? withT : withT + 'Z';
    return new Date(iso);
  }

  // ─── Display helper: answer sheet file names for the Answer Sheet(s) column ───
  getAnswerSheetDisplay(student: StudentUploadStatus): string {
    if (student.answerSheetType === 'Images') {
      // If imageFileNames set locally (just uploaded) — use them
      if (student.imageFileNames?.length) {
        return student.imageFileNames.join(', ');
      }
      // If fileName from DB contains pipe-separated original names
      if (student.fileName?.includes('|')) {
        return student.fileName.split('|').join(', ');
      }
      // Single image name
      if (student.fileName) return student.fileName;
    }
    return student.fileName || '';
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

  override ngOnDestroy(): void {
    this.pageContext.clearSubtitle();
  }
}