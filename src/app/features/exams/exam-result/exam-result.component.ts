import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamResultService } from '../../../core/services/exam-result.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  StudentInfo,
  ExamResult,
  ExamQuestion,
} from '../../../core/models/exam-result';
import {
  ClassDto,
  ExamTypeDto,
  MasterDataService,
  SectionDto,
  SubjectDto,
} from '../../../core/services/master-data.service';
import { ViewAnswerSheetService } from '../../../core/services/view-answer-sheet.service';
import { QuestionPaperDto } from '../../../core/models/exam';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-result.component.html',
  styleUrls: ['./exam-result.component.css'],
})
export class ExamResultsComponent implements OnInit {
  private examResultService = inject(ExamResultService);
  private toastService = inject(ToastService);
  private masterDataService = inject(MasterDataService);
  private viewAnswerSheetService = inject(ViewAnswerSheetService);
  private uploadAnswerSheetService = inject(UploadAnswerSheetService);

  // Filter selections
  selectedClass: number | null = null;
  selectedSection: number | null = null;
  selectedSubject: number | null = null;
  selectedExamType: number | null = null;
  questionPapers: QuestionPaperDto[] = [];
  selectedQuestionPaperId: number | null = null;

  // Student data
  students: StudentInfo[] = [];
  selectedStudent: StudentInfo | null = null;

  // Exam metadata
  totalMarks = 0;
  totalQuestions = 0;
  questionNumbers: number[] = [];
  statistics: any = {
    totalStudents: 0,
    absentCount: 0,
    evaluatedCount: 0,
    notEvaluatedCount: 0,
  };

  // Current question data
  currentResults: ExamResult | null = null;
  currentQuestion: ExamQuestion | null = null;
  currentQuestionIndex = 0;

  // UI state
  isLoading = false;
  isLoadingQuestion = false;
  isViewing = false;
  showStudentsCard = false;
  showResultsCard = false;
  searchCompleted = false;
  noExamPaperFound = false;
  showQuestionPaperDropdown = false;

  // Fullscreen modal
  fullscreenContent: string | null = null;
  fullscreenType: string | null = null;

  // Dropdown data
  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];
  examTypes: ExamTypeDto[] = [];

  ngOnInit(): void {
    this.loadClasses();
  }

  // ============================================
  // Initialization
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

  onClassSelected(classId: number): void {
    this.resetFilters();
    if (classId === null) return;

    this.loadSections(classId);
    this.loadSubjects(classId);
    this.loadExamTypes(classId);
  }

  private resetFilters(): void {
    this.selectedSection = null;
    this.selectedSubject = null;
    this.selectedExamType = null;

    this.sections = [];
    this.subjects = [];
    this.examTypes = [];

    this.students = [];
    this.showStudentsCard = false;
    this.showResultsCard = false;
  }

  private loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.handleError('Failed to load sections', error);
      },
    });
  }

  private loadSubjects(classId: number): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (error) => {
        this.handleError('Failed to load subjects', error);
      },
    });
  }

  private loadExamTypes(classId: number): void {
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.examTypes = examTypes;
      },
      error: (error) => {
        this.handleError('Failed to load exam types', error);
      },
    });
  }

  onSectionChange(): void {
    this.clearData();
  }

  // Clear students when subject changes
  onSubjectChange(): void {
    this.clearData();
  }

  //  Clear students when exam type changes

  onExamTypeChange(): void {
    this.clearData();
    this.questionPapers = [];
    this.selectedQuestionPaperId = null;
    this.showQuestionPaperDropdown = false;

    if (
      this.selectedClass === null ||
      this.selectedSubject === null ||
      this.selectedExamType === null
    ) {
      return;
    }

    this.uploadAnswerSheetService
      .getQuestionPapers(
        this.selectedClass!,
        this.selectedSubject!,
        this.selectedExamType!,
      )
      .subscribe({
        next: (response) => {
          const papers = response.data ?? [];
          this.questionPapers = papers;

          if (papers.length === 0) {
            return;
          }

          const selectedExam = this.examTypes.find(
            (e) => e.id === Number(this.selectedExamType),
          );

          const examTypeName = selectedExam?.examTypeName ?? '';

          //  CASE 1: Only one paper
          if (papers.length === 1) {
            const paperName = papers[0].questionPaperName ?? '';

            if (examTypeName === paperName) {
              // Same name → no dropdown → auto select
              this.selectedQuestionPaperId = papers[0].id;
              this.showQuestionPaperDropdown = false;
            } else {
              // Different name → show dropdown → user must select
              this.showQuestionPaperDropdown = true;
            }
          }

          //  CASE 2: Multiple papers → always dropdown
          if (papers.length > 1) {
            this.showQuestionPaperDropdown = true;
          }
        },
        error: (error) => {
          this.handleError('Failed to load question papers', error);
        },
      });
  }

  // ============================================
  // Get Students
  // ============================================

  showStudents(): void {
    if (!this.validateSelection()) return;

    // Validate dropdown only if visible
    if (this.showQuestionPaperDropdown && !this.selectedQuestionPaperId) {
      this.toastService.showWarning('Warning', 'Please select Question Paper');
      return;
    }

    this.isLoading = true;
    this.noExamPaperFound = false;

    this.examResultService
      .getStudentListWithStatistics(
        this.selectedClass!,
        this.selectedSection!,
        this.selectedSubject!,
        this.selectedExamType!,
        this.selectedQuestionPaperId!,
      )
      .subscribe({
        next: (response) => {
          this.students = response.students;
          this.statistics = response.statistics;
          this.totalMarks = response.totalMarks;
          this.totalQuestions = response.totalQuestions;
          this.questionNumbers = response.questionNumbers;

          this.showStudentsCard = true;
          this.showResultsCard = false;
          this.searchCompleted = true;
          this.isLoading = false;

          this.noExamPaperFound = this.students.length === 0;
        },
        error: (error) => {
          this.isLoading = false;

          if (error.status === 404) {
            this.noExamPaperFound = true;
            this.students = [];
            this.showStudentsCard = true;
            this.toastService.showWarning('Warning', error.error.message);
          } else {
            this.handleError('Failed to load students', error);
          }
        },
      });
  }

  private validateSelection(): boolean {
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

  private getEmptyStatistics(): any {
    return {
      totalStudents: 0,
      absentCount: 0,
      evaluatedCount: 0,
      notEvaluatedCount: 0,
    };
  }

  // ============================================
  // View Student Results
  // ============================================

  viewStudentResults(student: StudentInfo): void {
    if (!student) {
      this.toastService.showWarning('Warning', 'No student selected');
      return;
    }

    this.selectedStudent = student;
    this.showStudentsCard = false;
    this.showResultsCard = true;
    this.currentResults = {
      studentId: student.studentId,
      studentName: student.studentName,
      totalMarks: this.totalMarks,
      questions: [] as ExamQuestion[],
      isAbsent: student.isAbsent,
      evaluationStatus: student.evaluationStatus,
    };

    this.currentQuestionIndex = 0;

    // Load first question
    if (this.totalQuestions > 0 && !student.isAbsent) {
      this.loadQuestion(0);
    }
  }

  backToStudentsList(): void {
    this.showResultsCard = false;
    this.showStudentsCard = true;
    this.selectedStudent = null;
    this.currentResults = null;
    this.currentQuestion = null;
    this.currentQuestionIndex = 0;
  }

  // ============================================
  // Question Navigation
  // ============================================

  loadQuestion(index: number): void {
    if (!this.selectedStudent) {
      this.toastService.showWarning('Warning', 'No student selected');
      return;
    }

    if (index < 0 || index >= this.totalQuestions) {
      this.toastService.showError('Error', 'Invalid question index');
      return;
    }

    this.isLoadingQuestion = true;

    this.examResultService
      .getQuestionDetails(
        this.selectedStudent.studentId,
        this.selectedClass!,
        this.selectedSubject!,
        this.selectedExamType!,
        index + 1,
      )
      .subscribe({
        next: (question: any) => {
          if (!question) {
            this.toastService.showError('Error', 'Question data is empty');
            this.isLoadingQuestion = false;
            return;
          }

          this.currentQuestion = question;
          this.currentQuestionIndex = index;
          this.initializeRubrics();
          this.isLoadingQuestion = false;
        },
        error: (error) => {
          this.isLoadingQuestion = false;
          this.handleError('Failed to load question', error);
        },
      });
  }

  private initializeRubrics(): void {
    if (!this.currentQuestion?.rubrics) return;

    this.currentQuestion.rubrics.forEach((rubric: any) => {
      rubric.isEditing = false;

      // Set marks: teacher marks > system marks
      if (rubric.marksAssignedByTeacher && rubric.marksAssignedByTeacher > 0) {
        rubric.marksGiven = rubric.marksAssignedByTeacher;
        rubric.teacherModified = true;
      } else {
        rubric.marksGiven = rubric.marksAssignedBySystem || 0;
        rubric.teacherModified = false;
      }

      // Store original values
      rubric.originalMarksGiven = rubric.marksGiven;
      rubric.originalRemarks = rubric.remarks || '';
    });
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.loadQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.loadQuestion(this.currentQuestionIndex - 1);
    }
  }

  getProgressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    return ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
  }

  // ============================================
  // Rubric Editing
  // ============================================

  enableRubricEdit(rubric: any): void {
    if (!rubric) return;

    rubric.isEditing = true;
    rubric.originalMarksGiven = rubric.marksGiven;
    rubric.originalRemarks = rubric.remarks;
  }

  cancelRubricEdit(rubric: any): void {
    if (!rubric) return;

    rubric.isEditing = false;
    rubric.marksGiven = rubric.originalMarksGiven;
    rubric.remarks = rubric.originalRemarks;
  }

  isRubricValid(rubric: any): boolean {
    if (!rubric) return false;

    // Marks range
    if (rubric.marksGiven < 0 || rubric.marksGiven > rubric.maxMarks) {
      return false;
    }

    // Remarks required
    if (!rubric.remarks || rubric.remarks.trim() === '') {
      return false;
    }

    // Max 1 decimal place
    const marksStr = rubric.marksGiven.toString();
    if (marksStr.includes('.')) {
      const decimalPart = marksStr.split('.')[1];
      if (decimalPart && decimalPart.length > 1) {
        return false;
      }
    }

    return true;
  }

  saveRubric(rubric: any): void {
    if (!this.selectedStudent || !this.currentQuestion) {
      this.toastService.showWarning('Warning', 'No question selected');
      return;
    }

    if (!rubric) {
      this.toastService.showError('Error', 'Invalid rubric data');
      return;
    }

    if (!this.isRubricValid(rubric)) {
      this.toastService.showError(
        'Error',
        'Please enter valid marks (0.5 step) and remarks',
      );
      return;
    }

    if (!this.isRubricChanged(rubric)) {
      rubric.isEditing = false;
      this.toastService.showInfo('Info', 'No changes to save');
      return;
    }

    rubric.isSaving = true;
    this.isLoading = true;

    const rubricData = [
      {
        questionPaperRubricId: rubric.questionPaperRubricId || rubric.id,
        teacherAssignedMarks: rubric.marksGiven,
        teacherRemarks: rubric.remarks.trim(),
      },
    ];

    this.examResultService
      .updateQuestionRubrics(
        this.selectedStudent.studentId,
        this.selectedClass!,
        this.selectedSubject!,
        this.selectedExamType!,
        this.currentQuestion.questionNumber,
        rubricData,
      )
      .subscribe({
        next: () => {
          rubric.isEditing = false;
          rubric.teacherModified = true;
          rubric.originalMarksGiven = rubric.marksGiven;
          rubric.originalRemarks = rubric.remarks;
          rubric.isSaving = false;
          this.isLoading = false;
          this.toastService.showSuccess('Success', 'Marks saved successfully!');
        },
        error: (error) => {
          rubric.isSaving = false;
          this.isLoading = false;
          this.handleError('Failed to save marks', error);
        },
      });
  }

  public isRubricChanged(rubric: any): boolean {
    if (!rubric || !rubric.isEditing) return false;

    const marksChanged =
      Number(rubric.marksGiven) !== Number(rubric.originalMarksGiven);

    const remarksChanged =
      (rubric.remarks || '').trim() !== (rubric.originalRemarks || '').trim();

    return marksChanged && remarksChanged;
  }

  // ============================================
  // Fullscreen Modal
  // ============================================

  openFullscreen(type: string): void {
    this.fullscreenType = type;
    this.fullscreenContent = type;
    document.body.style.overflow = 'hidden';
  }

  closeFullscreen(): void {
    this.fullscreenContent = null;
    this.fullscreenType = null;
    document.body.style.overflow = 'auto';
  }

  getFullscreenTitle(): string {
    switch (this.fullscreenType) {
      case 'questionText':
        return 'Question Text';
      case 'officialAnswer':
        return 'Official Answer';
      case 'studentAnswer':
        return "Student's Answer";
      default:
        return '';
    }
  }

  getFullscreenContent(): string {
    if (!this.currentQuestion) return '';

    switch (this.fullscreenType) {
      case 'questionText':
        return this.currentQuestion.questionText;
      case 'officialAnswer':
        return this.currentQuestion.officialAnswer;
      case 'studentAnswer':
        return this.currentQuestion.studentAnswerText || 'Not answered';
      default:
        return '';
    }
  }

  // ============================================
  // View Answer Sheet
  // ============================================

  viewAnswerSheet(student: StudentInfo): void {
    if (!student) {
      this.toastService.showWarning('Warning', 'No student selected');
      return;
    }

    if (!student.documentUrl && !student.fileName) {
      this.toastService.showWarning('Warning', 'Answer sheet not available');
      return;
    }

    try {
      const url = this.viewAnswerSheetService.getAnswerSheetUrl(
        student.studentId,
        this.selectedClass!,
        this.selectedSubject!,
        this.selectedExamType!,
      );

      const newWindow = window.open(url, '_blank');

      if (
        !newWindow ||
        newWindow.closed ||
        typeof newWindow.closed === 'undefined'
      ) {
        this.toastService.showWarning(
          'Popup Blocked',
          'Please allow popups for this site to view answer sheets',
        );
        return;
      }

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
  // Helper Methods
  // ============================================

  getPercentage(): number {
    if (!this.selectedStudent || !this.totalMarks || this.totalMarks === 0) {
      return 0;
    }
    const obtained = this.selectedStudent.obtainedMarks || 0;
    return Math.round((obtained / this.totalMarks) * 100);
  }

  isAnyRubricEditing(): boolean {
    if (!this.currentQuestion?.rubrics) return false;
    return this.currentQuestion.rubrics.some((r: any) => r.isEditing);
  }

  getTotalRubricMarks(): number {
    if (!this.currentQuestion?.rubrics) return 0;
    return this.currentQuestion.rubrics.reduce(
      (sum: number, r: any) => sum + (r.marksGiven || 0),
      0,
    );
  }

  restrictToHalfStep(event: any): void {
    const value = event.target.value;
    const regex = /^\d*(\.(0|5)?)?$/;

    if (!regex.test(value)) {
      event.target.value = value.slice(0, -1);
    }
  }

  private clearData(): void {
    this.students = [];
    this.selectedStudent = null;
    this.currentResults = null;
    this.currentQuestion = null;
    this.showStudentsCard = false;
    this.showResultsCard = false;
    this.searchCompleted = false;
    this.statistics = {
      totalStudents: 0,
      absentCount: 0,
      evaluatedCount: 0,
      notEvaluatedCount: 0,
    };
  }

  // ============================================
  // ✅ Centralized Error Handling
  // ============================================

  private handleError(userMessage: string, error: any): void {
    const errorMessage = this.extractErrorMessage(error);

    // Log for debugging (only in development)
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
    // Check environment
    // return environment.production;
    return false; // For now, always show console logs
  }
}
