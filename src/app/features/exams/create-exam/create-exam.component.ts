import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { CreateExamService } from '../../../core/services/create-exam.service';
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

@Component({
  selector: 'app-exam-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.css'],
})
export class CreateExamComponent implements OnInit {
  private toastService = inject(ToastService);
  private createExamService = inject(CreateExamService);
  private masterDataService = inject(MasterDataService);

  // Mode state
  examMode: 'upload' | 'update' = 'upload';
  questionsGenerated = false;
  currentQuestionIndex = 0;

  // Loading states
  isLoading = false;
  isSubmitting = false;

  // Dropdown data
  allClasses: ClassDto[] = [];
  allSubjects: SubjectDto[] = [];
  allExamTypes: ExamTypeDto[] = [];

  // Update mode data
  existingExams: Exam[] = [];
  selectedExamForUpdate: Exam | null = null;

  // Question sets
  questionSets: QuestionSet[] = [];

  // Upload progress
  uploadProgress = {
    visible: false,
    width: '0%',
    text: '',
  };

  // Form data
  examFormData: ExamFormData = {
    academicYear: this.createExamService.getCurrentAcademicYear(),
    classId: '',
    subjectId: '',
    examTypeId: '',
    totalMarks: null,
    numberOfQuestions: null,
      questionPaperName: '',
    questionSets: [],
  };

  // Filter data (update mode)
  examFilters: ExamFilters = {
    filterExamClass: '',
    filterExamSubject: '',
    filterExamExamType: '',
  };

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
        this.allClasses = classes;
      },
      error: (error) => {
        this.handleError('Failed to load classes', error);
      },
    });
  }

  // ============================================
  // Dropdown Change Handlers (Upload Mode)
  // ============================================

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
    // Load subjects
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.allSubjects = subjects;
      },
      error: (error) => {
        this.handleError('Failed to load subjects', error);
      },
    });

    // Load exam types
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.allExamTypes = examTypes;
      },
      error: (error) => {
        this.handleError('Failed to load exam types', error);
      },
    });
  }

  // ============================================
  // Filter Handlers (Update Mode)
  // ============================================

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
      next: (subjects) => {
        this.allSubjects = subjects;
      },
      error: (error) => {
        this.handleError('Failed to load subjects', error);
      },
    });

    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.allExamTypes = examTypes;
      },
      error: (error) => {
        this.handleError('Failed to load exam types', error);
      },
    });
  }

  // ============================================
  // Generate Questions
  // ============================================

generateQuestions(): void {

  // If Question Paper Name is empty → set default as Exam Type
  if (!this.examFormData.questionPaperName?.trim()) {

    const selectedExamType = this.allExamTypes.find(
        e => e.id === +this.examFormData.examTypeId
    );

    if (selectedExamType) {
      this.examFormData.questionPaperName = selectedExamType.examTypeName;
    }
  }

  // Validate form
  if (!this.validateExamBasicInfo()) return;

  try {

    this.questionSets = this.createExamService.generateQuestionSets(
      this.examFormData.numberOfQuestions!,
      this.examFormData.totalMarks!,
    );

    this.examFormData.questionSets = this.questionSets;
    this.questionsGenerated = true;
    this.currentQuestionIndex = 0;

    this.toastService.showSuccess(
      'Questions Generated',
      `${this.questionSets.length} questions created successfully`,
    );

  } catch (error) {
    this.handleError('Failed to generate questions', error);
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
      this.toastService.showError(
        'Error',
        'Please enter valid total marks (minimum 1)',
      );
      return false;
    }

    if (
      !this.examFormData.numberOfQuestions ||
      this.examFormData.numberOfQuestions < 1
    ) {
      this.toastService.showError(
        'Error',
        'Please enter valid number of questions (minimum 1)',
      );
      return false;
    }

    return true;
  }

  // ============================================
  // Question Navigation
  // ============================================

  get currentQuestionSet(): QuestionSet {
    return this.questionSets[this.currentQuestionIndex];
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questionSets.length - 1;
  }

  goToPreviousQuestion(): void {
    //  Allow going back without validation (recommended)
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }

    // Option 2: Validate before going back (strict mode)
    // if you want to validate before going back too

    const errors = this.getQuestionValidationErrors();

    if (errors.length > 0) {
      this.toastService.showWarning(
        'Warning',
        'Please fix current question before navigating',
      );
      return;
    }

    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

 goToNextQuestion(): void {
  // ✅ STEP 1: Check if this is a 1-mark question
  if (this.currentQuestionSet.maxMarks === 1) {
    // ✅ Auto-fill validation rule for 1-mark question
    this.autoFillOneMarkQuestion();
  }

  // ✅ STEP 2: Validate current question
  const errors = this.getQuestionValidationErrors();
  
  if (errors.length > 0) {
    this.toastService.showError('Validation Error', errors[0]);
    return; // BLOCKED
  }

  // ✅ STEP 3: Check marks match (only if NOT auto-filled)
  if (this.currentQuestionSet.maxMarks !== 1 && !this.validateMarksMatch()) {
    const total = this.calculateValidationMarksTotal();
    const max = this.currentQuestionSet.maxMarks || 0;
    
    if (total > max) {
      this.toastService.showError(
        'Validation Error',
        `Validation marks (${total}) exceed maximum marks (${max}). Please adjust.`
      );
    } else if (total < max) {
      this.toastService.showError(
        'Validation Error',
        `Validation marks (${total}) are less than maximum marks (${max}). Please add more.`
      );
    }
    return; // BLOCKED
  }

  // ✅ STEP 4: Move to next question
  if (this.currentQuestionIndex < this.questionSets.length - 1) {
    this.currentQuestionIndex++;
    
    if (this.currentQuestionSet.maxMarks === 1) {
      this.toastService.showSuccess('Success', 'Question saved (1 mark - no rubric needed)');
    } else {
      this.toastService.showSuccess('Success', 'Question saved! Moving to next question.');
    }
  }
}

// ============================================
//  Auto-fill 1-mark question
// ============================================

private autoFillOneMarkQuestion(): void {
  // Set default values for 1-mark question
  this.currentQuestionSet.validationRulesCount = 1;
  this.currentQuestionSet.rubricPoints = [
    {
      description: 'Default criterion for 1-mark question',
      marks: 1,
      isAutoGenerated: true // ✅ Flag to identify auto-generated rubrics
    }
  ];
}

// ============================================
// Computed property to check if rubrics should be shown
// ============================================

get shouldShowValidationRules(): boolean {
  if (!this.currentQuestionSet) return false;
  
  // ✅ Hide validation rules UI for 1-mark questions
  return this.currentQuestionSet.maxMarks !== 1;
}

  // ============================================
  // Submit Exam
  // ============================================

  submitExamDocuments(): void {
    // ✅ Validate current (last) question
    const currentQuestionErrors = this.getQuestionValidationErrors();
    if (currentQuestionErrors.length > 0) {
      this.toastService.showError('Validation Error', currentQuestionErrors[0]);
      return; // ✅ STOP submission
    }

    // ✅ Validate marks match for current question
    if (!this.validateMarksMatch()) {
      this.toastService.showError(
        'Validation Error',
        'Validation marks must match maximum marks',
      );
      return; // ✅ STOP submission
    }

    // ✅ Validate entire exam form
    const formValidation = this.createExamService.validateExamForm(
      this.examFormData,
    );
    if (!formValidation.isValid) {
      this.toastService.showError('Validation Error', formValidation.errors[0]);
      return; // ✅ STOP submission
    }

    // All validations passed - proceed with submission
    this.submitToBackend();
  }

  private submitToBackend(): void {
    this.isSubmitting = true;
    this.uploadProgress.visible = true;
    this.uploadProgress.text = 'Uploading exam...';
    this.uploadProgress.width = '50%';

    const apiRequest = this.createExamService.prepareApiRequest(
      this.examFormData,
    );

    this.createExamService.createExam(apiRequest).subscribe({
      next: (response) => {
        this.uploadProgress.width = '100%';
        this.uploadProgress.text = 'Upload complete!';

        setTimeout(() => {
          this.uploadProgress.visible = false;
          this.isSubmitting = false;
          this.toastService.showSuccess(
            'Success',
            'Exam uploaded successfully',
          );
          this.resetForm();
        }, 500);
      },
      error: (error) => {
        this.uploadProgress.visible = false;
        this.isSubmitting = false;
        this.handleError('Failed to upload exam', error);
      },
    });
  }

  // ============================================
  // Load Existing Exams (Update Mode)
  // ============================================

  loadExistingExams(): void {
    if (!this.validateFilters()) return;

    this.isLoading = true;

    this.createExamService.getMockExams(this.examFilters).subscribe({
      next: (exams) => {
        this.existingExams = exams;
        this.isLoading = false;

        if (exams.length === 0) {
          this.toastService.showInfo(
            'Info',
            'No exams found with selected filters',
          );
        } else {
          this.toastService.showSuccess(
            'Success',
            `${exams.length} exam(s) found`,
          );
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.handleError('Failed to load exams', error);
      },
    });
  }

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
    if (!exam) return;
    this.selectedExamForUpdate = exam;
  }

  // ============================================
  // Validation Rules
  // ============================================

  generateValidationRules(): void {
    if (!this.currentQuestionSet) {
      this.toastService.showError('Error', 'No question selected');
      return;
    }

    const rulesCount = this.currentQuestionSet.validationRulesCount || 1;

    // Add rules if needed
    while (this.currentQuestionSet.rubricPoints.length < rulesCount) {
      this.currentQuestionSet.rubricPoints.push({
        description: '',
        marks: null,
      });
    }

    // Remove excess rules
    if (this.currentQuestionSet.rubricPoints.length > rulesCount) {
      this.currentQuestionSet.rubricPoints =
        this.currentQuestionSet.rubricPoints.slice(0, rulesCount);
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
    return this.createExamService.calculateValidationMarksTotal(
      this.currentQuestionSet,
    );
  }

  validateMarksMatch(): boolean {
    if (!this.currentQuestionSet) return false;
    return this.createExamService.validateMarksMatch(this.currentQuestionSet);
  }

  getQuestionValidationErrors(): string[] {
    if (!this.currentQuestionSet) return ['No question selected'];
    return this.createExamService.validateQuestionSet(this.currentQuestionSet)
      .errors;
  }

  // ============================================
  // Mode Management
  // ============================================

  setExamMode(mode: 'upload' | 'update'): void {
    this.examMode = mode;
    this.resetForm();
  }

  clearFilters(): void {
    this.examFilters = {
      filterExamClass: '',
      filterExamSubject: '',
      filterExamExamType: '',
    };
    this.existingExams = [];
    this.selectedExamForUpdate = null;
  }

  // ============================================
  // Helper Methods
  // ============================================

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private resetForm(): void {
    this.examFormData = {
      academicYear: this.createExamService.getCurrentAcademicYear(),
      classId: '',
      subjectId: '',
      examTypeId: '',
      totalMarks: null,
      numberOfQuestions: null,
      questionPaperName: '',
      questionSets: [],
    };

    this.questionSets = [];
    this.questionsGenerated = false;
    this.currentQuestionIndex = 0;
    this.existingExams = [];
    this.selectedExamForUpdate = null;

    this.examFilters = {
      filterExamClass: '',
      filterExamSubject: '',
      filterExamExamType: '',
    };

    this.allSubjects = [];
    this.allExamTypes = [];
  }

  // ============================================
  // ✅ Centralized Error Handling
  // ============================================

  private handleError(userMessage: string, error: any): void {
    const errorMessage = this.extractErrorMessage(error);

    // Log for debugging (development only)
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
    // return environment.production;
    return false; // For now, always show console logs
  }
}
