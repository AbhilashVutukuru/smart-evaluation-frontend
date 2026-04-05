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
  isSubmittedForEvaluation = false;  // set locally after successful submit

  // ─── Computed statistics ──────────────────────────────────────────────────────
  get totalStudents(): number { return this.students.length; }
  get absentCount():   number { return this.students.filter((s) => s.isAbsent).length; }
  get uploadedCount(): number { return this.students.filter((s) => s.isUploaded).length; }
  get pendingCount():  number { return this.students.filter((s) => !s.isUploaded && !s.isAbsent).length; }
  get canEvaluate():  boolean { return this.students.length > 0 && this.students.every((s) => s.isUploaded || s.isAbsent); }

  // ─── Exposed from base ────────────────────────────────────────────────────────
  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Abstract implementation ──────────────────────────────────────────────────
  protected override clearStudents(): void {
    this.students            = [];
    this.showStudentsCard    = false;
    this.isSubmittedForEvaluation = false;
    this.absentStudentIds    = [];
    this.noExamPaperFound    = false;
  }

  // ─── Clear list whenever any filter changes ───────────────────────────────────
  override onClassChange(classId: string): void {
    this.clearStudents();
    super.onClassChange(classId);
  }

  override onSectionChange(): void {
    this.clearStudents();
    super.onSectionChange();
  }

  override onSubjectChange(): void {
    this.clearStudents();
    super.onSubjectChange();
  }

  override onExamTypeChange(): void {
    this.clearStudents();
    super.onExamTypeChange();
  }

  // ─── Show Students ────────────────────────────────────────────────────────────

 showStudents(): void {
    if (!this.validateSelection()) return;

    this.noExamPaperFound = false;
    this.showStudentsCard = false;
    this.isSubmittedForEvaluation = false;
    this.absentStudentIds = [];
    this.students = [];
    this.loading = true;

    this.uploadService
      .getStudentsWithUploadStatus(
        +this.selectedClass,
        +this.selectedSection,
        +this.selectedSubject,
        +this.selectedExamType,
        this.selectedQuestionPaperId!,
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.isSubmittedForEvaluation = response.data.isEvaluationSubmitted ?? false;
            const rawStudents = response.data.students ?? [];
            if (rawStudents.length > 0) {
              this.students = this.mapStudents(rawStudents);
              this.absentStudentIds = this.students
                .filter((s) => s.isAbsent)
                .map((s) => s.studentId);
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
            this.students = [];
            this.showStudentsCard = true;
          });
        },
      });
  }

  private mapStudents(raw: unknown[]): StudentUploadStatus[] {
    return raw.map((item) => {
      const s = item as Record<string, unknown>;
      return {
        studentId:   s['studentId']   as number,
        rollNumber:  s['rollNumber']  as string,
        studentName: s['studentName'] as string,
        className:   s['className']   as string,
        sectionName: s['sectionName'] as string,
        isAbsent:    (s['isAbsent']   as boolean) ?? false,
        isUploaded:
          typeof s['status'] === 'string' &&
          s['status'].toLowerCase().includes('uploaded') &&
          !s['status'].toLowerCase().includes('not'),
        fileName: (s['fileName'] as string) || (s['documentName'] as string) || '',
      };
    });
  }

  // ─── File Upload ──────────────────────────────────────────────────────────────

  onFileSelected(event: Event, student: StudentUploadStatus, isUpdate: boolean): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file?.type === 'application/pdf') {
      student.answerSheetFile = file;
      isUpdate ? this.updateAnswerSheet(student) : this.uploadAnswerSheet(student);
    } else {
      this.toastService.showError('Error', 'Please select a PDF file');
    }
  }

  uploadAnswerSheet(student: StudentUploadStatus): void {
    if (!student.answerSheetFile) return;
    student.isUploading = true;

    this.uploadService.uploadStudentAnswer(this.buildFormData(student)).subscribe({
      next: (response) => {
        if (response.success) {
          student.isUploaded = true;
          student.fileName = student.answerSheetFile?.name;
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
          student.fileName = student.answerSheetFile?.name;
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
    return fd;
  }

  // ─── Toggle Absent ────────────────────────────────────────────────────────────

  toggleAbsent(student: StudentUploadStatus): void {
    student.isAbsent = !student.isAbsent;
    if (student.isAbsent) {
      student.isUploaded = false;
      student.answerSheetFile = undefined;
      if (!this.absentStudentIds.includes(student.studentId)) {
        this.absentStudentIds.push(student.studentId);
      }
    } else {
      this.absentStudentIds = this.absentStudentIds.filter((id) => id !== student.studentId);
    }
  }

  // ─── Submit All ───────────────────────────────────────────────────────────────

  submitAllStudents(): void {
    if (!this.canEvaluate) {
      this.toastService.showWarning('Warning', 'Please upload answer sheets for all students or mark them as absent');
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
}