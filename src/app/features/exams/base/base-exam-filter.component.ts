import { inject, OnInit, OnDestroy, Directive } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService }          from '../../../core/services/toast.service';
import { ErrorHandlerService }   from '../../../core/services/error-handler.service';
import { ClassDto, ExamTypeDto, MasterDataService, SectionDto, SubjectDto } from '../../../core/services/master-data.service';
import { ViewAnswerSheetService }    from '../../../core/services/view-answer-sheet.service';
import { UploadAnswerSheetService }  from '../../../core/services/upload-answer-sheet.service';
import { QuestionPaperDto }          from '../../../core/models/common.models';
import { CreateQuestionPaperService } from '../../../core/services/create-question-paper.service';
import { Router } from '@angular/router';

@Directive()
export abstract class BaseExamFilterComponent implements OnInit, OnDestroy {
  protected toastService               = inject(ToastService);
  protected errorHandler               = inject(ErrorHandlerService);
  protected masterDataService          = inject(MasterDataService);
  protected viewAnswerSheetService     = inject(ViewAnswerSheetService);
  protected uploadAnswerSheetService   = inject(UploadAnswerSheetService);
  protected createQuestionPaperService = inject(CreateQuestionPaperService);
  // FIX: inject Router here so openAnswerSheet can be called from base
  // without each subclass needing to inject it separately
  protected router                     = inject(Router);

  // FIX: shared destroy$ so all base subscriptions are cancelled when
  // the subclass component is destroyed — prevents memory leaks
  protected destroy$ = new Subject<void>();

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

  // FIX: base ngOnDestroy — subclasses that override must call super.ngOnDestroy()
  // or use their own destroy$ (which they should extend from this one)
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClasses(): void {
    this.masterDataService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  onQuestionPaperChange(): void {
    this.clearStudents();
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleQuestionPapersResponse(response.data ?? []);
          this.isLoadingPapers = false;
        },
        error: () => {
          // FIX: generic message — no server error details shown to user
          this.isLoadingPapers  = false;
          this.toastService.showWarning('Warning', 'No exam paper found for selected combination');
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

    this.noExamPaperFound = false;

    if (papers.length === 1) {
      this.selectedQuestionPaperId   = papers[0].id;
      this.showQuestionPaperDropdown = !!papers[0].questionPaperName?.trim();
    } else {
      this.selectedQuestionPaperId   = null;
      this.showQuestionPaperDropdown = true;
    }
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
    this.masterDataService.getSectionsByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sections) => (this.sections = sections),
        error: (error)   => this.errorHandler.handle('Failed to load sections', error),
      });
  }

  private loadSubjects(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => (this.subjects = subjects),
        error: (error)   => this.errorHandler.handle('Failed to load subjects', error),
      });
  }

  private loadExamTypes(classId: string): void {
    this.isLoadingExamTypes = true;
    this.masterDataService.getExamTypesByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    if (!this.selectedClass || !this.selectedSection ||
        !this.selectedSubject || !this.selectedExamType) {
      this.toastService.showWarning('Warning', 'Please select all required fields');
      return false;
    }
    if (this.showQuestionPaperDropdown && !this.selectedQuestionPaperId) {
      this.toastService.showWarning('Warning', 'Please select Question Paper');
      return false;
    }
    return true;
  }

  protected openAnswerSheet(studentId: number, fileName?: string): void {
    const params = new URLSearchParams({
      studentId:       studentId.toString(),
      classId:         this.selectedClass,
      subjectId:       this.selectedSubject,
      examTypeId:      this.selectedExamType,
      questionPaperId: this.selectedQuestionPaperId?.toString() ?? '',
      fileName:        fileName || 'answer-sheet.pdf',
      _t:              Date.now().toString(),
    });
    window.open(`/view-pdf?${params.toString()}`, '_blank');
  }

  protected abstract clearStudents(): void;
}