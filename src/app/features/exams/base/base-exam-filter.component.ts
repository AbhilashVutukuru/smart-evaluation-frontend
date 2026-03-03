// ============================================
// BASE EXAM FILTER COMPONENT
// Shared filter logic inherited by both
// UploadAnswerSheetsComponent and ExamResultsComponent
// ============================================

import { inject, OnInit, Directive } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ClassDto, ExamTypeDto, MasterDataService, SectionDto, SubjectDto } from '../../../core/services/master-data.service';
import { ViewAnswerSheetService } from '../../../core/services/view-answer-sheet.service';
import { UploadAnswerSheetService } from '../../../core/services/upload-answer-sheet.service';
import { QuestionPaperDto } from '../../../core/models/common.models';
import { CreateQuestionPaperService } from '../../../core/services/create-question-paper.service';

@Directive()
export abstract class BaseExamFilterComponent implements OnInit {
  protected toastService               = inject(ToastService);
  protected errorHandler               = inject(ErrorHandlerService);
  protected masterDataService          = inject(MasterDataService);
  protected viewAnswerSheetService     = inject(ViewAnswerSheetService);
  protected uploadAnswerSheetService   = inject(UploadAnswerSheetService);
  protected createQuestionPaperService = inject(CreateQuestionPaperService);

  // Filter selections
  selectedClass    = '';
  selectedSection  = '';
  selectedSubject  = '';
  selectedExamType = '';
  selectedQuestionPaperId: number | null = null;

  // Dropdown data
  classes:        ClassDto[]         = [];
  sections:       SectionDto[]       = [];
  subjects:       SubjectDto[]       = [];
  examTypes:      ExamTypeDto[]      = [];
  questionPapers: QuestionPaperDto[] = [];

  // Shared UI state
  noExamPaperFound          = false;
  showStudentsCard          = false;
  showQuestionPaperDropdown = false;
  isLoadingPapers           = false;
  isLoadingExamTypes        = false;

  ngOnInit(): void {
    this.loadClasses();
  }

  private loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => (this.classes = classes),
      error: (error)  => this.errorHandler.handle('Failed to load classes', error),
    });
  }

  onClassChange(classId: string): void {
    this.resetDependentDropdowns();
    if (!classId) return;
    this.loadSections(classId);
    this.loadSubjects(classId);
    this.loadExamTypes(classId);
  }

  onSectionChange(): void {
    this.clearStudents();
    this.selectedSubject           = '';
    this.selectedExamType          = '';
    this.questionPapers            = [];
    this.selectedQuestionPaperId   = null;
    this.showQuestionPaperDropdown = false;
    this.isLoadingPapers           = false;
    this.isLoadingExamTypes        = false;
    this.noExamPaperFound          = false;
  }

  onSubjectChange(): void {
    this.clearStudents();
    this.selectedExamType          = '';
    this.questionPapers            = [];
    this.selectedQuestionPaperId   = null;
    this.showQuestionPaperDropdown = false;
    this.noExamPaperFound          = false;
  }

  onExamTypeChange(): void {
    this.clearStudents();
    this.questionPapers            = [];
    this.selectedQuestionPaperId   = null;
    this.showQuestionPaperDropdown = false;
    this.noExamPaperFound          = false;

    if (!this.selectedClass || !this.selectedSubject || !this.selectedExamType) return;

    this.isLoadingPapers = true;

    this.createQuestionPaperService
      .getQuestionPapers(+this.selectedClass, +this.selectedSubject, +this.selectedExamType)
      .subscribe({
        next: (response) => {
          this.isLoadingPapers = false;
          this.handleQuestionPapersResponse(response.data ?? []);
        },
        error: (error) => {
          this.isLoadingPapers  = false;
          const msg = error?.error?.message || 'No exam paper found for selected combination';
          this.toastService.showWarning('Warning', msg);
          this.noExamPaperFound = true;
          this.clearStudents();
        },
      });
  }

  private handleQuestionPapersResponse(papers: QuestionPaperDto[]): void {
    this.questionPapers = papers;

    if (!papers.length) {
      this.toastService.showWarning('Warning', 'No exam paper found for selected combination');
      this.noExamPaperFound = true;
      return;
    }

    this.noExamPaperFound          = false;
    this.selectedQuestionPaperId   = papers.length === 1 ? papers[0].id : null;
    this.showQuestionPaperDropdown = true;
  }

  protected resetDependentDropdowns(): void {
    this.selectedSection           = '';
    this.selectedSubject           = '';
    this.selectedExamType          = '';
    this.sections                  = [];
    this.subjects                  = [];
    this.examTypes                 = [];
    this.questionPapers            = [];
    this.selectedQuestionPaperId   = null;
    this.showQuestionPaperDropdown = false;
    this.isLoadingPapers           = false;
    this.isLoadingExamTypes        = false;
    this.noExamPaperFound          = false;
  }

  private loadSections(classId: string): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => (this.sections = sections),
      error: (error)   => this.errorHandler.handle('Failed to load sections', error),
    });
  }

  private loadSubjects(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => (this.subjects = subjects),
      error: (error)   => this.errorHandler.handle('Failed to load subjects', error),
    });
  }

  private loadExamTypes(classId: string): void {
    this.isLoadingExamTypes = true;
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.examTypes          = examTypes;
        this.isLoadingExamTypes = false;
      },
      error: (error) => {
        this.isLoadingExamTypes = false;
        this.errorHandler.handle('Failed to load exam types', error);
      },
    });
  }

  public get canShowStudents(): boolean {
    if (this.noExamPaperFound) return false;
    if (this.isLoadingPapers)  return false;

    return (
      !!this.selectedClass   &&
      !!this.selectedSection &&
      !!this.selectedSubject &&
      !!this.selectedExamType &&
      !!this.selectedQuestionPaperId
    );
  }

  protected validateSelection(): boolean {
    if (!this.selectedClass || !this.selectedSection || !this.selectedSubject || !this.selectedExamType) {
      this.toastService.showWarning('Warning', 'Please select all required fields');
      return false;
    }
    if (this.showQuestionPaperDropdown && !this.selectedQuestionPaperId) {
      this.toastService.showWarning('Warning', 'Please select Question Paper');
      return false;
    }
    return true;
  }

  protected openAnswerSheet(studentId: number): void {
    try {
      const url = this.viewAnswerSheetService.getAnswerSheetUrl(
        studentId,
        +this.selectedClass,
        +this.selectedSubject,
        +this.selectedExamType,
      );
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        this.toastService.showWarning('Popup Blocked', 'Please allow popups for this site to view answer sheets');
        return;
      }
      newWindow.onerror = () => this.toastService.showError('Error', 'Failed to load answer sheet');
    } catch {
      this.toastService.showError('Error', 'Failed to open answer sheet');
    }
  }

  protected abstract clearStudents(): void;
}



















