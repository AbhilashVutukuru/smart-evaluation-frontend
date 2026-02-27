// ============================================
// IMPROVED ERROR HANDLING
// ============================================

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  MasterDataService,
  ClassDto,
  ExamTypeDto,
  SectionDto,
  SubjectDto,
} from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';
import { ViewAnswerSheetService } from '../../../core/services/view-answer-sheet.service';

interface StudentUploadStatus {
  studentId: number;
  rollNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  isAbsent: boolean;
  isUploaded: boolean;
  isUploading?: boolean;
  answerSheetFile?: File;
  fileName?: string;
}

@Component({
  selector: 'app-upload-student-marks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './upload-answer-sheet.component.html',
  styleUrls: ['./upload-answer-sheet.component.css'],
})
export class UploadAnswerSheetsComponent implements OnInit {
  private uploadAnswerSheetService = inject(UploadAnswerSheetService);
  private masterDataService = inject(MasterDataService);
  private toastService = inject(ToastService);
  private viewAnswerSheetService = inject(ViewAnswerSheetService);

  // Filter properties
  selectedClass = '';
  selectedSection = '';
  selectedSubject = '';
  selectedExamType = '';
  absentStudentIds: number[] = [];

  // Dropdown data
  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];
  examTypes: ExamTypeDto[] = [];

  // Student data
  students: StudentUploadStatus[] = [];

  // UI state
  showStudentsCard = false;
  loading = false;
  isViewing=false;
  isSubmittingAll = false;
  isEvaluationCompleted = false;

  // ============================================
  // Computed Properties (Statistics)
  // ============================================

  get totalStudents(): number {
    return this.students.length;
  }

  get absentCount(): number {
    return this.students.filter((s) => s.isAbsent).length;
  }

  get uploadedCount(): number {
    return this.students.filter((s) => s.isUploaded).length;
  }

  get pendingCount(): number {
    return this.students.filter((s) => !s.isUploaded && !s.isAbsent).length;
  }

  get canEvaluate(): boolean {
    if (!this.students || this.students.length === 0) return false;
    return this.students.every((s) => s.isUploaded || s.isAbsent);
  }

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.loadClasses();
  }

  // ============================================
  // Load Initial Data
  // ============================================

  private loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
      },
      error: (error) => {
        this.handleError('Failed to load classes', error);
      },
    });
  }

  // ============================================
  // Dropdown Change Handlers
  // ============================================

  onClassChange(classId: string): void {
    this.showStudentsCard = false;
    this.resetDependentDropdowns();
    if (!classId) return;

    this.loadSections(classId);
    this.loadSubjects(classId);
    this.loadExamTypes(classId);
  }

    onSectionChange(): void {
    this.students = [];
    this.showStudentsCard = false;
  }

  // Clear students when subject changes
  onSubjectChange(): void {
    this.students = [];
    this.showStudentsCard = false;
  }

  //  Clear students when exam type changes
  onExamTypeChange(): void {
    this.students = [];
    this.showStudentsCard = false;
  }

  private resetDependentDropdowns(): void {
    this.selectedSection = '';
    this.selectedSubject = '';
    this.selectedExamType = '';
    this.sections = [];
    this.subjects = [];
    this.examTypes = [];
  }

  private loadSections(classId: string): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.handleError('Failed to load sections', error);
      },
    });
  }

  private loadSubjects(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (error) => {
        this.handleError('Failed to load subjects', error);
      },
    });
  }

  private loadExamTypes(classId: string): void {
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.examTypes = examTypes;
      },
      error: (error) => {
        this.handleError('Failed to load exam types', error);
      },
    });
  }

  // validateFilters(): void {
  //   // Validation happens in validateFiltersBeforeLoad
  // }

  // ============================================
  // Show Students
  // ============================================

  showStudents(): void {
    if (!this.validateFiltersBeforeLoad()) return;

    this.resetState();
    this.loading = true;

    this.uploadAnswerSheetService
      .getStudentsWithUploadStatus(
        +this.selectedClass,
        +this.selectedSection,
        +this.selectedSubject,
        +this.selectedExamType,
      )
      .subscribe({
        next: (response) => {
          this.handleStudentsResponse(response);
        },
        error: (error) => {
          this.loading = false;
          this.handleError('Failed to load students', error);
        },
      });
  }

  private validateFiltersBeforeLoad(): boolean {
    if (
      !this.selectedClass ||
      !this.selectedSection ||
      !this.selectedSubject ||
      !this.selectedExamType
    ) {
      this.toastService.showWarning(
        'Warning',
        'Please select all required fields',
      );
      return false;
    }
    return true;
  }

  private resetState(): void {
    this.showStudentsCard = false;
    this.isEvaluationCompleted = false;
    this.absentStudentIds = [];
  }

  private handleStudentsResponse(response: any): void {
    if (response.success && Array.isArray(response.data.students)) {
      const rawStudents = response.data.students;

      if (rawStudents.length > 0) {
        this.students = this.mapStudents(rawStudents);
        this.updateAbsentStudentIds();

        if (response.data.pendingCount === 0) {
          this.isEvaluationCompleted = true;
        }

         this.showStudentsCard = true;
      this.toastService.showSuccess('Success', 'Students loaded successfully');
      }
      else{
        this.toastService.showWarning('Warning', 'No Students found or No question Paper created for that subject or Exam type');
      }
     
    }
    this.loading = false;
  }

  private mapStudents(rawStudents: any[]): StudentUploadStatus[] {
    return rawStudents.map((s: any) => ({
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      studentName: s.studentName,
      className: s.className,
      sectionName: s.sectionName,
      isAbsent: s.isAbsent ?? false,
      isUploaded:
        s.status?.toLowerCase().includes('uploaded') === true &&
        !s.status?.toLowerCase().includes('not'),
      fileName: s.fileName || s.documentName || '',
    }));
  }

  private updateAbsentStudentIds(): void {
    this.absentStudentIds = this.students
      .filter((student) => student.isAbsent)
      .map((student) => student.studentId);
  }

  // ============================================
  // File Upload
  // ============================================

  onFileSelected(event: any, student: StudentUploadStatus): void {
    const file = event.target.files[0];

    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.toastService.showError('Error', 'Please select a PDF file');
      return;
    }

    student.answerSheetFile = file;
    this.uploadAnswerSheet(student);
  }

  uploadAnswerSheet(student: StudentUploadStatus): void {
    if (!student.answerSheetFile) return;

    student.isUploading = true;

    const formData = this.createUploadFormData(student);

    this.uploadAnswerSheetService.uploadStudentAnswer(formData).subscribe({
      next: (response) => {
        if (response.success) {
          student.isUploaded = true;
          student.fileName = student.answerSheetFile?.name;
          this.toastService.showSuccess(
            'Success',
            `Answer sheet uploaded for ${student.studentName}`,
          );
        }
        student.isUploading = false;
      },
      error: (error) => {
        student.isUploading = false;
        this.handleError(
          `Failed to upload answer sheet for ${student.studentName}`,
          error,
        );
      },
    });
  }

  private createUploadFormData(student: StudentUploadStatus): FormData {
    const formData = new FormData();
    formData.append('StudentAnswerSheetFile', student.answerSheetFile!);
    formData.append('StudentId', student.studentId.toString());
    formData.append('ClassId', this.selectedClass);
    formData.append('SectionId', this.selectedSection);
    formData.append('SubjectId', this.selectedSubject);
    formData.append('ExamTypeId', this.selectedExamType);
    return formData;
  }

  // ============================================
  // Toggle Absent
  // ============================================

  toggleAbsent(student: StudentUploadStatus): void {
    student.isAbsent = !student.isAbsent;

    if (student.isAbsent) {
      this.markStudentAsAbsent(student);
    } else {
      this.unmarkStudentAsAbsent(student);
    }
  }

  private markStudentAsAbsent(student: StudentUploadStatus): void {
    student.isUploaded = false;
    student.answerSheetFile = undefined;

    if (!this.absentStudentIds.includes(student.studentId)) {
      this.absentStudentIds.push(student.studentId);
    }
  }

  private unmarkStudentAsAbsent(student: StudentUploadStatus): void {
    this.absentStudentIds = this.absentStudentIds.filter(
      (id) => id !== student.studentId,
    );
  }

  // ============================================
  // Submit All Students
  // ============================================

  submitAllStudents(): void {
    if (!this.canEvaluate) {
      this.toastService.showWarning(
        'Warning',
        'Please upload answer sheets for all students or mark them as absent',
      );
      return;
    }

    this.isSubmittingAll = true;

    const payload = {
      classId: +this.selectedClass,
      sectionId: +this.selectedSection,
      subjectId: +this.selectedSubject,
      examTypeId: +this.selectedExamType,
      absentStudentIds: this.absentStudentIds,
    };

    this.uploadAnswerSheetService.submitAllStudents(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.isEvaluationCompleted = true;
          this.toastService.showSuccess(
            'Success',
            response.message || 'Evaluation started successfully',
          );
        }
        this.isSubmittingAll = false;
      },
      error: (error) => {
        this.isSubmittingAll = false;
        this.handleError('Failed to start evaluation', error);
      },
    });
  }

  // ============================================
  // Download Answer Sheet
  // ============================================

  // downloadAnswerSheet(student: StudentUploadStatus): void {
  //   if (!student) {
  //     this.toastService.showWarning('Warning', 'No student selected');
  //     return;
  //   }

  //   this.loading = true;

  //   this.uploadAnswerSheetService
  //     .downloadAnswerSheet(
  //       student.studentId,
  //       parseInt(this.selectedClass),
  //       parseInt(this.selectedSubject),
  //       parseInt(this.selectedExamType),
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         const blob = response.body as Blob;

  //         // Extract filename from header
  //         const contentDisposition = response.headers.get(
  //           'content-disposition',
  //         );
  //         let fileName = 'AnswerSheet.pdf';

  //         if (contentDisposition) {
  //           //  First try filename* (UTF-8 standard)
  //           const utf8Match = contentDisposition.match(
  //             /filename\*=UTF-8''([^;]+)/,
  //           );

  //           if (utf8Match && utf8Match[1]) {
  //             fileName = decodeURIComponent(utf8Match[1]);
  //           } else {
  //             // Fallback to normal filename=
  //             const normalMatch = contentDisposition.match(/filename=([^;]+)/);

  //             if (normalMatch && normalMatch[1]) {
  //               fileName = normalMatch[1].replace(/"/g, '').trim();
  //             }
  //           }
  //         }

  //         this.downloadFile(blob, fileName);
  //         this.loading = false;
  //         this.toastService.showSuccess(
  //           'Success',
  //           'Answer sheet downloaded successfully',
  //         );
  //       },
  //       error: (error) => {
  //         this.loading = false;
  //         this.handleError('Failed to download answer sheet', error);
  //       },
  //     });
  // }

  // private downloadFile(blob: Blob, fileName: string): void {
  //   const url = window.URL.createObjectURL(blob);
  //   const link = document.createElement('a');

  //   link.href = url;
  //   link.download = fileName; //  Use backend filename

  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);

  //   window.URL.revokeObjectURL(url);
  // }

  // ============================================
  // View Answer Sheet
  // ============================================ 

  viewAnswerSheet(student: StudentUploadStatus): void {
    // Validation
    if (!student) {
      this.toastService.showWarning('Warning', 'No student selected');
      return;
    }    

    try {
      // Generate URL
      const url = this.viewAnswerSheetService.getAnswerSheetUrl(
        student.studentId,
        +this.selectedClass,
        +this.selectedSubject,
        +this.selectedExamType
      );

      // Open in new tab with error handling
      const newWindow = window.open(url, '_blank');

      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        this.toastService.showWarning(
          'Popup Blocked',
          'Please allow popups for this site to view answer sheets'
        );
        return;
      }

      //  Handle new window errors
      newWindow.onerror = (error) => {
        console.error('Error loading answer sheet:', error);
        this.toastService.showError('Error', 'Failed to load answer sheet');
      };

    } catch (error) {
      console.error('View error:', error);
      this.toastService.showError('Error', 'Failed to open answer sheet');
    }
  }

  // ============================================
  //  CENTRALIZED ERROR HANDLING
  // ============================================

  private handleError(userMessage: string, error: any): void {
    // Extract error message from different error formats
    const errorMessage = this.extractErrorMessage(error);

    // Log to console for debugging (only in development)
    if (!this.isProduction()) {
      console.error('Error Details:', {
        userMessage,
        error,
        errorMessage,
      });
    }

    // Show toast notification
    this.toastService.showError('Error', errorMessage || userMessage);
  }

  private extractErrorMessage(error: any): string {
    // Try different error formats
    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }

    if (error?.message) {
      return error.message;
    }

    if (typeof error?.error === 'string') {
      return error.error;
    }

    if (error?.statusText) {
      return error.statusText;
    }

    return '';
  }

  private isProduction(): boolean {
    // You can check environment here
    // return environment.production;
    return false; // For now, always show console logs
  }
}
