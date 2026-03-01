import { inject } from '@angular/core';
import {
  ClassDto,
  ExamTypeDto,
  MasterDataService,
  SectionDto,
  SubjectDto,
} from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { QuestionPaperDto } from '../../core/models/exam';

/**
 * Base class for components that need exam filter functionality
 * (Class → Section → Subject → ExamType → QuestionPaper)
 */
export abstract class ExamFilterBaseComponent {
  protected masterDataService = inject(MasterDataService);
  protected toastService = inject(ToastService);

  // Filter selections - strongly typed
  selectedClass: number | null = null;
  selectedSection: number | null = null;
  selectedSubject: number | null = null;
  selectedExamType: number | null = null;
  selectedQuestionPaper: number | null = null;

  // Dropdown data - strongly typed
  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];
  examTypes: ExamTypeDto[] = [];
  questionPapers: QuestionPaperDto[] = [];

  // UI state
  loading = false;

  // ============================================
  // Initialization
  // ============================================

  protected loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes: ClassDto[]) => {
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

  onClassChange(): void {
    this.resetDependentFilters();
    this.clearData();

    if (!this.selectedClass) return;

    this.loadSections(this.selectedClass);
    this.loadSubjects(this.selectedClass);
    this.loadExamTypes(this.selectedClass);
  }

  onSectionChange(): void {
    this.clearData();
  }

  onSubjectChange(): void {
    this.selectedQuestionPaper = null;
    this.questionPapers = [];
    this.clearData();
  }

  onExamTypeChange(): void {
    this.selectedQuestionPaper = null;
    this.questionPapers = [];
    this.clearData();

    if (this.selectedExamType && this.selectedClass && this.selectedSubject) {
      this.loadQuestionPapers();
    }
  }

  onQuestionPaperChange(): void {
    this.clearData();
  }

  // ============================================
  // Data Loading
  // ============================================

  private loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections: SectionDto[]) => {
        this.sections = sections;
      },
      error: (error) => {
        this.handleError('Failed to load sections', error);
      },
    });
  }

  private loadSubjects(classId: number): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects: SubjectDto[]) => {
        this.subjects = subjects;
      },
      error: (error) => {
        this.handleError('Failed to load subjects', error);
      },
    });
  }

  private loadExamTypes(classId: number): void {
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes: ExamTypeDto[]) => {
        this.examTypes = examTypes;
      },
      error: (error) => {
        this.handleError('Failed to load exam types', error);
      },
    });
  }

  protected abstract loadQuestionPapers(): void;

  // ============================================
  // Validation
  // ============================================

  protected validateFilters(): boolean {
    if (
      !this.selectedClass ||
      !this.selectedSection ||
      !this.selectedSubject ||
      !this.selectedExamType
    ) {
      this.toastService.showWarning(
        'Warning',
        'Please select all required fields'
      );
      return false;
    }
    return true;
  }

  protected validateFiltersWithQuestionPaper(): boolean {
    if (!this.validateFilters()) return false;

    if (!this.selectedQuestionPaper) {
      this.toastService.showWarning(
        'Warning',
        'Please select a question paper'
      );
      return false;
    }
    return true;
  }

  // ============================================
  // Reset Methods
  // ============================================

  private resetDependentFilters(): void {
    this.selectedSection = null;
    this.selectedSubject = null;
    this.selectedExamType = null;
    this.selectedQuestionPaper = null;
    this.sections = [];
    this.subjects = [];
    this.examTypes = [];
    this.questionPapers = [];
  }

  protected abstract clearData(): void;

  // ============================================
  // Error Handling
  // ============================================

  protected handleError(message: string, error: any): void {
    const errorMessage = error?.error?.message || error?.message || message;
    this.toastService.showError('Error', errorMessage);
    this.loading = false;
  }
}