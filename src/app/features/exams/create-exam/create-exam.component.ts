import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateExamService } from '../../../core/services/create-exam.service';
import { MasterDataService, ClassDto, SubjectDto, ExamTypeDto } from '../../../core/services/master-data.service';
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

  // Properties
  examMode: 'upload' | 'update' = 'upload';
  questionsGenerated = false;
  currentQuestionIndex = 0;
  isLoading = false;
  isSubmitting = false;

  // ✅ UPDATED: Using DTOs from MasterDataService
  allClasses: ClassDto[] = [];
  allSubjects: SubjectDto[] = [];
  allExamTypes: ExamTypeDto[] = [];
  existingExams: Exam[] = [];
  selectedExamForUpdate: Exam | null = null;

  questionSets: QuestionSet[] = [];

  uploadProgress = {
    visible: false,
    width: '0%',
    text: '',
  };

  examFormData: ExamFormData = {
    academicYear: this.createExamService.getCurrentAcademicYear(),
    classId: '',
    subjectId: '',
    examTypeId: '',
    totalMarks: null,
    numberOfQuestions: null,
    questionSets: [],
  };

  examFilters: ExamFilters = {
    filterExamClass: '',
    filterExamSubject: '',
    filterExamExamType: '',
  };

  ngOnInit(): void {
    this.loadInitialData();
  }

  // ============================================================
  // ✅ UPDATED: Load classes using MasterDataService
  // ============================================================
  private loadInitialData(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => {
        this.allClasses = classes;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load classes');
      }
    });
  }

  // ============================================================
  // ✅ UPDATED: Load subjects and exam types using MasterDataService
  // ============================================================
  onClassSelected(classId: string): void {
    // Reset dependent dropdowns
    this.examFormData.subjectId = '';
    this.examFormData.examTypeId = '';
    this.allSubjects = [];
    this.allExamTypes = [];

    if (!classId) {
      return;
    }

    // ✅ Load subjects for selected class
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.allSubjects = subjects;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load subjects');
      }
    });

    // ✅ Load exam types for selected class
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.allExamTypes = examTypes;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load exam types');
      }
    });
  }

  // ============================================================
  // ✅ UPDATED: Filter dropdowns for update mode
  // ============================================================
  onFilterClassSelected(classId: string): void {
    // Reset dependent filters
    this.examFilters.filterExamSubject = '';
    this.examFilters.filterExamExamType = '';
    this.existingExams = [];
    this.allSubjects = [];
    this.allExamTypes = [];

    if (!classId) {
      return;
    }

    // ✅ Load subjects and exam types for filtering
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.allSubjects = subjects;
      }
    });

    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.allExamTypes = examTypes;
      }
    });
  }

  // ============================================================
  // Generate Questions
  // ============================================================
  generateQuestions(): void {
    if (
      !this.examFormData.classId ||
      !this.examFormData.subjectId ||
      !this.examFormData.examTypeId ||
      !this.examFormData.totalMarks ||
      !this.examFormData.numberOfQuestions
    ) {
      this.toastService.showError(
        'Validation Error',
        'Please fill all required fields',
      );
      return;
    }

    this.questionSets = this.createExamService.generateQuestionSets(
      this.examFormData.numberOfQuestions,
      this.examFormData.totalMarks,
    );
    this.examFormData.questionSets = this.questionSets;
    this.questionsGenerated = true;
    this.currentQuestionIndex = 0;
    this.toastService.showSuccess(
      'Questions Generated',
      `${this.questionSets.length} questions created successfully`,
    );
  }

  // ============================================================
  // Question Navigation
  // ============================================================
  get currentQuestionSet(): QuestionSet {
    return this.questionSets[this.currentQuestionIndex];
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questionSets.length - 1;
  }

  goToPreviousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  goToNextQuestion(): void {
    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) {
      this.toastService.showError('Validation Error', errors[0]);
      return;
    }

    if (this.currentQuestionIndex < this.questionSets.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  // ============================================================
  // Submit Exam
  // ============================================================
  submitExamDocuments(): void {
    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) {
      this.toastService.showError('Validation Error', errors[0]);
      return;
    }

    const formValidation = this.createExamService.validateExamForm(
      this.examFormData,
    );
    if (!formValidation.isValid) {
      this.toastService.showError('Validation Error', formValidation.errors[0]);
      return;
    }

    this.isSubmitting = true;
    this.uploadProgress.visible = true;

    const apiRequest = this.createExamService.prepareApiRequest(
      this.examFormData,
    );

    this.createExamService.uploadExam(apiRequest).subscribe({
      next: (response) => {
        this.uploadProgress.visible = false;
        this.isSubmitting = false;
        this.toastService.showSuccess('Success', 'Exam uploaded successfully');
        this.resetForm();
      },
      error: (error) => {
        this.uploadProgress.visible = false;
        this.isSubmitting = false;
        this.toastService.showError(
          'Error',
          error.message || 'Failed to upload exam',
        );
      },
    });
  }

  // ============================================================
  // Load Existing Exams (Update Mode)
  // ============================================================
  loadExistingExams(): void {
    if (
      !this.examFilters.filterExamClass ||
      !this.examFilters.filterExamSubject ||
      !this.examFilters.filterExamExamType
    ) {
      this.toastService.showError(
        'Validation Error',
        'Please select Class, Subject, and Exam Type',
      );
      return;
    }

    this.isLoading = true;
    this.createExamService.getMockExams(this.examFilters).subscribe({
      next: (exams) => {
        this.existingExams = exams;
        this.isLoading = false;
        if (exams.length === 0) {
          this.toastService.showInfo('Info', 'No exams found with selected filters');
        } else {
          this.toastService.showSuccess('Success', `${exams.length} exam(s) found`);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.toastService.showError('Error', 'Failed to load exams');
      },
    });
  }

  selectExamForUpdate(exam: Exam): void {
    this.selectedExamForUpdate = exam;
  }

  // ============================================================
  // Validation Rules
  // ============================================================
  generateValidationRules(): void {
    const rulesCount = this.currentQuestionSet.validationRulesCount || 1;

    while (this.currentQuestionSet.rubricPoints.length < rulesCount) {
      this.currentQuestionSet.rubricPoints.push({
        description: '',
        marks: null,
      });
    }

    if (this.currentQuestionSet.rubricPoints.length > rulesCount) {
      this.currentQuestionSet.rubricPoints =
        this.currentQuestionSet.rubricPoints.slice(0, rulesCount);
    }
  }

  clearCurrentQuestion(): void {
    this.currentQuestionSet.questionText = '';
    this.currentQuestionSet.answerText = '';
    this.currentQuestionSet.maxMarks = null;
    this.currentQuestionSet.validationRulesCount = 1;
    this.currentQuestionSet.rubricPoints = [{ description: '', marks: null }];
    this.toastService.showInfo('Info', 'Question cleared');
  }

  calculateValidationMarksTotal(): number {
    return this.createExamService.calculateValidationMarksTotal(
      this.currentQuestionSet,
    );
  }

  validateMarksMatch(): boolean {
    return this.createExamService.validateMarksMatch(this.currentQuestionSet);
  }

  getQuestionValidationErrors(): string[] {
    return this.createExamService.validateQuestionSet(this.currentQuestionSet)
      .errors;
  }

  // ============================================================
  // Helper Methods
  // ============================================================
  setExamMode(mode: 'upload' | 'update'): void {
    this.examMode = mode;
    this.resetForm();
  }

  formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  getUserName(): string {
    const userInfo = this.createExamService.getUserInfo();
    return `${userInfo.firstName} ${userInfo.lastName}`;
  }

  getUserInitial(): string {
    const userInfo = this.createExamService.getUserInfo();
    return `${userInfo.firstName.charAt(0)}${userInfo.lastName.charAt(0)}`.toUpperCase();
  }

  getUserEmail(): string {
    const userInfo = this.createExamService.getUserInfo();
    return userInfo.email;
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
}