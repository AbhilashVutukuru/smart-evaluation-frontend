import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { CreateQuestionPaperService } from '../../../core/services/create-question-paper.service';
import {
  MasterDataService,
  ClassDto,
  SubjectDto,
  ExamTypeDto,
} from '../../../core/services/master-data.service';
import {
  ExamFormData,
  ExamFilters,
  QuestionSet,
  Exam,
} from '../../../core/models/exam';

interface UploadProgress {
  visible: boolean;
  width: string;
  text: string;
}

@Component({
  selector: 'app-exam-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-question-paper.component.html',
  styleUrls: ['./create-question-paper.component.css'],
})
export class CreateExamComponent implements OnInit {
  private toastService = inject(ToastService);
  private errorHandler = inject(ErrorHandlerService);
  private createQuestionPaperService = inject(CreateQuestionPaperService);
  private masterDataService = inject(MasterDataService);

  // ─── Mode state ───────────────────────────────────────────────────────────────
  examMode: 'upload' | 'update' = 'upload';
  questionsGenerated = false;
  currentQuestionIndex = 0;

  // ─── Loading states ───────────────────────────────────────────────────────────
  isLoading = false;
  isSubmitting = false;

  // ─── Dropdown data ────────────────────────────────────────────────────────────
  allClasses: ClassDto[] = [];
  allSubjects: SubjectDto[] = [];
  allExamTypes: ExamTypeDto[] = [];

  // ─── Update mode data ─────────────────────────────────────────────────────────
  existingExams: Exam[] = [];
  selectedExamForUpdate: Exam | null = null;

  // ─── Question sets ────────────────────────────────────────────────────────────
  questionSets: QuestionSet[] = [];

  // ─── Upload progress ──────────────────────────────────────────────────────────
  uploadProgress: UploadProgress = { visible: false, width: '0%', text: '' };

  // ─── Form data ────────────────────────────────────────────────────────────────
  examFormData: ExamFormData = {
    academicYear: this.createQuestionPaperService.getCurrentAcademicYear(),
    classId: '',
    subjectId: '',
    examTypeId: '',
    totalMarks: null,
    numberOfQuestions: null,
    questionPaperName: null,
    examDate: null,
    questionSets: [],
  };

  // ─── Date helpers ─────────────────────────────────────────────────────────────
  /** Today as YYYY-MM-DD — used as the min attribute on the date input */
  get todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** True when the supplied YYYY-MM-DD string is strictly before today (local) */
  isExamDateInPast(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const selected = new Date(y, m - 1, d);   // local midnight — no TZ shift
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }

  // ─── Filter data (update mode) ────────────────────────────────────────────────
  examFilters: ExamFilters = {
    filterExamClass: '',
    filterExamSubject: '',
    filterExamExamType: '',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadClasses();
  }

  // ─── Load Initial Data ────────────────────────────────────────────────────────

  private loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => (this.allClasses = classes),
      error: (error) => this.errorHandler.handle('Failed to load classes', error),
    });
  }

  // ─── Dropdown Change Handlers (Upload Mode) ───────────────────────────────────

  onClassSelected(classId: string): void {
    this.resetDependentDropdowns();
    if (!classId) return;
    this.loadSubjectsAndExamTypes(classId);
  }

  private resetDependentDropdowns(): void {
    this.examFormData.subjectId = '';
    this.examFormData.examTypeId = '';
    this.allSubjects = [];
    this.allExamTypes = [];
  }

  private loadSubjectsAndExamTypes(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => (this.allSubjects = subjects),
      error: (error) => this.errorHandler.handle('Failed to load subjects', error),
    });

    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => (this.allExamTypes = examTypes),
      error: (error) => this.errorHandler.handle('Failed to load exam types', error),
    });
  }

  // ─── Filter Handlers (Update Mode) ───────────────────────────────────────────

  onFilterClassSelected(classId: string): void {
    this.resetFilterDependents();
    if (!classId) return;
    this.loadFilterSubjectsAndExamTypes(classId);
  }

  private resetFilterDependents(): void {
    this.examFilters.filterExamSubject = '';
    this.examFilters.filterExamExamType = '';
    this.existingExams = [];
    this.allSubjects = [];
    this.allExamTypes = [];
  }

  private loadFilterSubjectsAndExamTypes(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => (this.allSubjects = subjects),
      error: (error) => this.errorHandler.handle('Failed to load subjects', error),
    });

    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => (this.allExamTypes = examTypes),
      error: (error) => this.errorHandler.handle('Failed to load exam types', error),
    });
  }

  // ─── Generate Questions ───────────────────────────────────────────────────────

  generateQuestions(): void {
    // if (!this.examFormData.questionPaperName?.trim()) {
    //   const selectedExamType = this.allExamTypes.find((e) => e.id === +this.examFormData.examTypeId);
    //   if (selectedExamType) {
    //     this.examFormData.questionPaperName = selectedExamType.examTypeName;
    //   }
    // }

    if (!this.validateExamBasicInfo()) return;

    try {
      this.questionSets = this.createQuestionPaperService.generateQuestionSets(
        this.examFormData.numberOfQuestions!,
        this.examFormData.totalMarks!,
      );
      this.examFormData.questionSets = this.questionSets;
      this.questionsGenerated = true;
      this.currentQuestionIndex = 0;
      this.toastService.showSuccess('Questions Generated', `${this.questionSets.length} questions created successfully`);
    } catch (error) {
      this.errorHandler.handle('Failed to generate questions', error);
    }
  }

  private validateExamBasicInfo(): boolean {
    if (!this.examFormData.classId) {
      this.toastService.showWarning('Warning', 'Please select a class');
      return false;
    }
    if (!this.examFormData.subjectId) {
      this.toastService.showWarning('Warning', 'Please select a subject');
      return false;
    }
    if (!this.examFormData.examTypeId) {
      this.toastService.showWarning('Warning', 'Please select an exam type');
      return false;
    }
    if (!this.examFormData.totalMarks || this.examFormData.totalMarks < 1) {
      this.toastService.showError('Error', 'Please enter valid total marks (minimum 1)');
      return false;
    }
    if (!this.examFormData.numberOfQuestions || this.examFormData.numberOfQuestions < 1) {
      this.toastService.showError('Error', 'Please enter valid number of questions (minimum 1)');
      return false;
    }
    return true;
  }

  // ─── Question Navigation ──────────────────────────────────────────────────────

  get currentQuestionSet(): QuestionSet {
    return this.questionSets[this.currentQuestionIndex];
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questionSets.length - 1;
  }

  get shouldShowValidationRules(): boolean {
    return !!this.currentQuestionSet && this.currentQuestionSet.maxMarks !== 1;
  }

  goToPreviousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }

    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) {
      this.toastService.showWarning('Warning', 'Please fix current question before navigating');
      return;
    }

    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  goToNextQuestion(): void {
    if (this.currentQuestionSet.maxMarks === 1) {
      this.autoFillOneMarkQuestion();
    }

    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) {
      this.toastService.showError('Validation Error', errors[0]);
      return;
    }

    if (this.currentQuestionSet.maxMarks !== 1 && !this.validateMarksMatch()) {
      const total = this.calculateValidationMarksTotal();
      const max = this.currentQuestionSet.maxMarks ?? 0;
      const message =
        total > max
          ? `Validation marks (${total}) exceed maximum marks (${max}). Please adjust.`
          : `Validation marks (${total}) are less than maximum marks (${max}). Please add more.`;
      this.toastService.showError('Validation Error', message);
      return;
    }

    if (this.currentQuestionIndex < this.questionSets.length - 1) {
      this.currentQuestionIndex++;
      const msg = this.currentQuestionSet.maxMarks === 1
        ? 'Question saved (1 mark - no rubric needed)'
        : 'Question saved! Moving to next question.';
      this.toastService.showSuccess('Success', msg);
    }
  }

  private autoFillOneMarkQuestion(): void {
    this.currentQuestionSet.validationRulesCount = 1;
    this.currentQuestionSet.rubricPoints = [
      { description: 'Default criterion for 1-mark question', marks: 1, isAutoGenerated: true },
    ];
  }

  // ─── Submit Exam ──────────────────────────────────────────────────────────────

  submitAll(): void {
    const currentErrors = this.getQuestionValidationErrors();
    if (currentErrors.length > 0) {
      this.toastService.showError('Validation Error', currentErrors[0]);
      return;
    }

    if (!this.validateMarksMatch()) {
      this.toastService.showError('Validation Error', 'Validation marks must match maximum marks');
      return;
    }

    const formValidation = this.createQuestionPaperService.validateExamForm(this.examFormData);
    if (!formValidation.isValid) {
      this.toastService.showError('Validation Error', formValidation.errors[0]);
      return;
    }

    this.submitToBackend();
  }

  private submitToBackend(): void {
    this.isSubmitting = true;
    this.uploadProgress = { visible: true, width: '50%', text: 'Uploading exam...' };

    const apiRequest = this.createQuestionPaperService.prepareApiRequest(this.examFormData);

    this.createQuestionPaperService.createExam(apiRequest).subscribe({
      next: () => {
        this.uploadProgress = { visible: true, width: '100%', text: 'Upload complete!' };
        setTimeout(() => {
          this.uploadProgress.visible = false;
          this.isSubmitting = false;
          this.toastService.showSuccess('Success', 'Exam uploaded successfully');
          this.resetForm();
        }, 500);
      },
      error: (error) => {
        this.uploadProgress.visible = false;
        this.isSubmitting = false;
        this.errorHandler.handle('Failed to upload exam', error);
      },
    });
  }

  // // ─── Load Existing Exams (Update Mode) ───────────────────────────────────────

  // loadExistingExams(): void {
  //   if (!this.validateFilters()) return;

  //   this.isLoading = true;

  //   this.createQuestionPaperService.getMockExams(this.examFilters).subscribe({
  //     next: (exams) => {
  //       this.existingExams = exams;
  //       this.isLoading = false;
  //       if (exams.length === 0) {
  //         this.toastService.showInfo('Info', 'No exams found with selected filters');
  //       } else {
  //         this.toastService.showSuccess('Success', `${exams.length} exam(s) found`);
  //       }
  //     },
  //     error: (error) => {
  //       this.isLoading = false;
  //       this.errorHandler.handle('Failed to load exams', error);
  //     },
  //   });
  // }

  private validateFilters(): boolean {
    if (!this.examFilters.filterExamClass) {
      this.toastService.showWarning('Warning', 'Please select a class');
      return false;
    }
    if (!this.examFilters.filterExamSubject) {
      this.toastService.showWarning('Warning', 'Please select a subject');
      return false;
    }
    if (!this.examFilters.filterExamExamType) {
      this.toastService.showWarning('Warning', 'Please select an exam type');
      return false;
    }
    return true;
  }

  selectExamForUpdate(exam: Exam): void {
    this.selectedExamForUpdate = exam;
  }

  // ─── Validation Rules ─────────────────────────────────────────────────────────

  generateValidationRules(): void {
    if (!this.currentQuestionSet) {
      this.toastService.showError('Error', 'No question selected');
      return;
    }

    const rulesCount = this.currentQuestionSet.validationRulesCount ?? 1;
    const current = this.currentQuestionSet.rubricPoints;

    while (current.length < rulesCount) {
      current.push({ description: '', marks: null });
    }

    if (current.length > rulesCount) {
      this.currentQuestionSet.rubricPoints = current.slice(0, rulesCount);
    }
  }

  clearCurrentQuestion(): void {
    if (!this.currentQuestionSet) return;
    this.currentQuestionSet.questionText = '';
    this.currentQuestionSet.answerText = '';
    this.currentQuestionSet.maxMarks = null;
    this.currentQuestionSet.validationRulesCount = 1;
    this.currentQuestionSet.rubricPoints = [{ description: '', marks: null }];
    this.toastService.showInfo('Info', 'Question cleared');
  }

  calculateValidationMarksTotal(): number {
    if (!this.currentQuestionSet) return 0;
    return this.createQuestionPaperService.calculateValidationMarksTotal(this.currentQuestionSet);
  }

  validateMarksMatch(): boolean {
    if (!this.currentQuestionSet) return false;
    return this.createQuestionPaperService.validateMarksMatch(this.currentQuestionSet);
  }

  getQuestionValidationErrors(): string[] {
    if (!this.currentQuestionSet) return ['No question selected'];
    return this.createQuestionPaperService.validateQuestionSet(this.currentQuestionSet).errors;
  }

  // ─── Mode Management ──────────────────────────────────────────────────────────

  setExamMode(mode: 'upload' | 'update'): void {
    this.examMode = mode;
    this.resetForm();
  }

  clearFilters(): void {
    this.examFilters = { filterExamClass: '', filterExamSubject: '', filterExamExamType: '' };
    this.existingExams = [];
    this.selectedExamForUpdate = null;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private resetForm(): void {
    this.examFormData = {
      academicYear: this.createQuestionPaperService.getCurrentAcademicYear(),
      classId: '',
      subjectId: '',
      examTypeId: '',
      totalMarks: null,
      numberOfQuestions: null,
      questionPaperName: null,
      examDate: null,
      questionSets: [],
    };
    this.questionSets = [];
    this.questionsGenerated = false;
    this.currentQuestionIndex = 0;
    this.existingExams = [];
    this.selectedExamForUpdate = null;
    this.examFilters = { filterExamClass: '', filterExamSubject: '', filterExamExamType: '' };
    this.allSubjects = [];
    this.allExamTypes = [];
  }
}