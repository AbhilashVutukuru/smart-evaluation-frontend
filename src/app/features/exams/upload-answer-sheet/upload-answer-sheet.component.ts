import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';

import {
  StudentUploadStatus,
  SubmitAllPayload,
} from '../../../core/models/upload-answer-sheet.models';
import { ExamFilterComponent } from '../exam-filter/exam-filter.component';
import { BaseExamFilterComponent } from '../base/base-exam-filter.component';

@Component({
  selector: 'app-upload-student-marks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ExamFilterComponent],
  templateUrl: './upload-answer-sheet.component.html',
  styleUrls: ['./upload-answer-sheet.component.css'],
})
export class UploadAnswerSheetsComponent extends BaseExamFilterComponent {
  private uploadService = inject(UploadAnswerSheetService);

  // ─── Student data ─────────────────────────────────────────────────────────────
  students: StudentUploadStatus[] = [];
  absentStudentIds: number[] = [];

  // ─── UI state ─────────────────────────────────────────────────────────────────
  loading = false;
  isViewing = false;
  isSubmittingAll = false;
  isSubmittedForEvaluation = false;

  // ─── Mobile image capture state ──────────────────────────────────────────────
  // Map of studentId → array of base64 data-URLs (one per captured page)
  private capturedImages = new Map<number, string[]>();

  // ─── Computed statistics ──────────────────────────────────────────────────────
  get totalStudents(): number { return this.students.length; }
  get absentCount():   number { return this.students.filter(s => s.isAbsent).length; }
  get uploadedCount(): number { return this.students.filter(s => s.isUploaded).length; }
  get pendingCount():  number { return this.students.filter(s => !s.isUploaded && !s.isAbsent).length; }
  get canEvaluate():  boolean { return this.students.length > 0 && this.students.every(s => s.isUploaded || s.isAbsent); }

  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Abstract implementation ──────────────────────────────────────────────────
  protected override clearStudents(): void {
    this.students                 = [];
    this.showStudentsCard         = false;
    this.isSubmittedForEvaluation = false;
    this.absentStudentIds         = [];
    this.noExamPaperFound         = false;
    this.capturedImages.clear();
  }

  // ─── Filter change overrides ──────────────────────────────────────────────────
  override onClassChange(classId: string): void { this.clearStudents(); super.onClassChange(classId); }
  override onSectionChange(): void { this.clearStudents(); super.onSectionChange(); }
  override onSubjectChange(): void { this.clearStudents(); super.onSubjectChange(); }
  override onExamTypeChange(): void { this.clearStudents(); super.onExamTypeChange(); }

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

  // ─── Desktop: PDF file selection ─────────────────────────────────────────────
  onFileSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file?.type === 'application/pdf') {
      student.answerSheetFile = file;
      isUpdate ? this.updateAnswerSheet(student) : this.uploadAnswerSheet(student);
    } else {
      this.toastService.showError('Error', 'Please select a PDF file');
    }
    // Reset input so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  // ─── Mobile: image / camera selection ────────────────────────────────────────
  /**
   * Called when user captures a photo or selects PNG/JPEG images from gallery.
   * Images are stored as preview; user confirms before uploading.
   * If only one image selected from camera, auto-upload immediately.
   */
  onImagesSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const invalid = files.find(f => !validTypes.includes(f.type));
    if (invalid) {
      this.toastService.showError('Error', 'Only PNG and JPEG images are supported');
      input.value = '';
      return;
    }

    // Read all images as base64 data-URLs
    const readers = files.map(file => this.readFileAsDataUrl(file));

    Promise.all(readers).then(dataUrls => {
      if (isUpdate) {
        // For update, convert immediately (no preview accumulation needed)
        this.convertImagesToPdfAndUpload(dataUrls, student, true);
      } else {
        // Accumulate into preview map
        const existing = this.capturedImages.get(student.studentId) ?? [];
        const merged   = [...existing, ...dataUrls];
        this.capturedImages.set(student.studentId, merged);

        // Single camera shot → auto-upload immediately for speed
        const isCameraCapture = input.accept?.includes('capture') ||
          input.getAttribute('capture') !== null;

        if (isCameraCapture && merged.length === 1) {
          this.uploadCapturedImages(student, false);
        }
        // Otherwise show preview strip → user taps "Upload X page(s)"
      }
    });

    input.value = '';
  }

  // ─── Preview strip helpers ────────────────────────────────────────────────────
  getPreviewImages(studentId: number): string[] {
    return this.capturedImages.get(studentId) ?? [];
  }

  clearPreviewImages(studentId: number): void {
    this.capturedImages.delete(studentId);
  }

  /** Called by "Upload X page(s) as PDF" button in the preview strip */
  uploadCapturedImages(student: StudentUploadStatus, isUpdate: boolean): void {
    const images = this.capturedImages.get(student.studentId);
    if (!images || images.length === 0) return;

    this.capturedImages.delete(student.studentId); // clear preview immediately
    this.convertImagesToPdfAndUpload(images, student, isUpdate);
  }

  // ─── Core conversion: images → PDF → upload ──────────────────────────────────
  private async convertImagesToPdfAndUpload(
    dataUrls: string[],
    student: StudentUploadStatus,
    isUpdate: boolean,
  ): Promise<void> {
    student.isUploading = true;

    try {
      const pdfBlob = await this.imagesToPdf(dataUrls, student.studentName);
      const fileName = `${student.studentName.replace(/\s+/g, '_')}_answers.pdf`;
      const pdfFile  = new File([pdfBlob], fileName, { type: 'application/pdf' });

      student.answerSheetFile = pdfFile;

      isUpdate
        ? this.updateAnswerSheet(student)
        : this.uploadAnswerSheet(student);

    } catch (err) {
      student.isUploading = false;
      this.toastService.showError('Error', 'Failed to convert images to PDF. Please try again.');
      console.error('Image→PDF conversion error:', err);
    }
  }

  /**
   * Converts an array of image data-URLs to a single PDF Blob.
   * Each image becomes one A4 page; image is scaled to fit within the page.
   * Uses jsPDF loaded from CDN (already in index.html).
   */
  private async imagesToPdf(dataUrls: string[], studentName: string): Promise<Blob> {
    // jsPDF loaded as window.jspdf.jsPDF (CDN UMD build)
    const jsPDF = (window as any)?.jspdf?.jsPDF ?? (window as any)?.jsPDF;

    if (!jsPDF) {
      throw new Error('jsPDF library not loaded. Add the CDN script to index.html.');
    }

    const A4_W_MM = 210;
    const A4_H_MM = 297;
    const MARGIN  = 8; // mm margin on each side
    const maxW    = A4_W_MM - MARGIN * 2;
    const maxH    = A4_H_MM - MARGIN * 2;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    for (let i = 0; i < dataUrls.length; i++) {
      if (i > 0) doc.addPage();

      const dataUrl = dataUrls[i];
      const imgProps = doc.getImageProperties(dataUrl);

      // Scale to fit within the A4 content area, preserving aspect ratio
      const ratio  = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const imgW   = imgProps.width  * ratio;
      const imgH   = imgProps.height * ratio;
      const x      = MARGIN + (maxW - imgW) / 2; // center horizontally
      const y      = MARGIN;

      const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, fmt, x, y, imgW, imgH, undefined, 'FAST');

      // Small page number footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${studentName} — Page ${i + 1} of ${dataUrls.length}`,
        A4_W_MM / 2,
        A4_H_MM - 4,
        { align: 'center' }
      );
    }

    return doc.output('blob') as Blob;
  }

  // ─── Upload / Update helpers ──────────────────────────────────────────────────
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

  // ─── Utility ──────────────────────────────────────────────────────────────────
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
      classId:         +this.selectedClass,
      sectionId:       +this.selectedSection,
      subjectId:       +this.selectedSubject,
      examTypeId:      +this.selectedExamType,
      questionPaperId: this.selectedQuestionPaperId!,
      absentStudentIds: this.absentStudentIds,
    };

    this.uploadService.submitAllStudents(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.isSubmittedForEvaluation = true;
          this.toastService.showSuccess('Success',
            response.message ?? 'Evaluation started successfully');
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
}