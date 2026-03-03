import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import {
  MasterDataService,
  ClassDto,
  SubjectDto,
  ExamTypeDto,
} from '../../../core/services/master-data.service';
import { QuestionPaperDto } from '../../../core/models/common.models';
import { QuestionPaperDetailDto, QuestionPaperViewDto, ViewQuestionPaperService } from '../../../core/services/view-question-paper.service';
import { CreateQuestionPaperService } from '../../../core/services/create-question-paper.service';

@Component({
  selector: 'app-view-question-paper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-question-paper.component.html',
  styleUrls: ['./view-question-paper.component.css'],
})
export class ViewQuestionPaperComponent {
  private viewService    = inject(ViewQuestionPaperService);
  private masterData     = inject(MasterDataService);
  private createService    = inject(CreateQuestionPaperService);
  private toastService   = inject(ToastService);
  private errorHandler   = inject(ErrorHandlerService);

  // ─── Filter selections ────────────────────────────────────────────────────
  selectedClass    = '';
  selectedSubject  = '';
  selectedExamType = '';
  selectedQuestionPaperId: number | null = null;

  // ─── Dropdown data ────────────────────────────────────────────────────────
  classes:        ClassDto[]         = [];
  subjects:       SubjectDto[]       = [];
  examTypes:      ExamTypeDto[]      = [];
  questionPapers: QuestionPaperDto[] = [];

  // ─── Loading flags ────────────────────────────────────────────────────────
  isLoadingSubjects   = false;
  isLoadingExamTypes  = false;
  isLoadingPapers     = false;
  isLoadingPaper      = false;
  noExamPaperFound  =false;

  // ─── View state ───────────────────────────────────────────────────────────
  questionPaper:        QuestionPaperViewDto | null = null;
  currentQuestion:      QuestionPaperDetailDto | null = null;
  currentQuestionIndex  = 0;
  showQuestionPaperDropdown = false;

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  fullscreenType:    string | null = null;
  fullscreenContent: string | null = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.masterData.getClasses().subscribe({
      next: (classes) => (this.classes = classes),
      error: (err)    => this.errorHandler.handle('Failed to load classes', err),
    });
  }

  // ─── Dropdown handlers ────────────────────────────────────────────────────

  onClassChange(classId: string): void {
    this.resetAll();
    if (!classId) return;

    this.isLoadingSubjects  = true;
    this.isLoadingExamTypes = true;

    this.masterData.getSubjectsByClass(classId).subscribe({
      next: (s) => { this.subjects = s; this.isLoadingSubjects = false; },
      error: (e) => { this.isLoadingSubjects = false; this.errorHandler.handle('Failed to load subjects', e); },
    });

    this.masterData.getExamTypesByClass(classId).subscribe({
      next: (e) => { this.examTypes = e; this.isLoadingExamTypes = false; },
      error: (e) => { this.isLoadingExamTypes = false; this.errorHandler.handle('Failed to load exam types', e); },
    });
  }

  onSubjectChange(): void {
    this.clearPapers();
    this.tryLoadPapers();
  }

  onExamTypeChange(): void {
    this.clearPapers();
    this.tryLoadPapers();
  }

  private tryLoadPapers(): void {
    if (!this.selectedClass || !this.selectedSubject || !this.selectedExamType) return;

    this.isLoadingPapers = true;

    this.createService
      .getQuestionPapers(+this.selectedClass, +this.selectedSubject, +this.selectedExamType)
      .subscribe({
        next: (res) => {
          this.isLoadingPapers = false;
          const papers = res.data ?? [];
          this.questionPapers = papers;

          if (!papers.length) {
            this.toastService.showWarning('Warning', 'No question paper found for selected combination');
            this.noExamPaperFound = true;
            return;
          }

          // Same as BaseExamFilterComponent.handleQuestionPapersResponse:
          // always show dropdown; pre-select when only 1 paper
          this.noExamPaperFound          = false;
          this.selectedQuestionPaperId   = papers.length === 1 ? papers[0].id : null;
          this.showQuestionPaperDropdown = true;
        },
        error: (err) => {
          this.isLoadingPapers  = false;
          this.noExamPaperFound = true;
          this.errorHandler.handle('Failed to load question papers', err);
        },
      });
  }

  // ─── Load question paper ──────────────────────────────────────────────────

  loadQuestionPaper(): void {
    if (!this.selectedQuestionPaperId) {
      this.toastService.showWarning('Warning', 'Please select a question paper');
      return;
    }

    this.isLoadingPaper  = true;
    this.questionPaper   = null;
    this.currentQuestion = null;

    this.viewService.getQuestionPaper(this.selectedQuestionPaperId).subscribe({
      next: (paper) => {
        this.questionPaper       = paper;
        this.currentQuestionIndex = 0;
        this.currentQuestion     = paper.questions[0] ?? null;
        this.isLoadingPaper      = false;
      },
      error: (err) => {
        this.isLoadingPaper = false;
        this.errorHandler.handle('Failed to load question paper', err);
      },
    });
  }

  // ─── Question navigation ──────────────────────────────────────────────────

  loadQuestion(index: number): void {
    if (!this.questionPaper) return;
    this.currentQuestionIndex = index;
    this.currentQuestion      = this.questionPaper.questions[index];
  }

  nextQuestion(): void {
    if (this.questionPaper && this.currentQuestionIndex < this.questionPaper.totalQuestions - 1) {
      this.loadQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.loadQuestion(this.currentQuestionIndex - 1);
    }
  }

  getProgressPercentage(): number {
    if (!this.questionPaper?.totalQuestions) return 0;
    return ((this.currentQuestionIndex + 1) / this.questionPaper.totalQuestions) * 100;
  }

  getTotalRubricMarks(): number {
    return this.currentQuestion?.rubrics.reduce((s, r) => s + r.maxMarks, 0) ?? 0;
  }

  // ─── Fullscreen ───────────────────────────────────────────────────────────

  openFullscreen(type: string): void {
    this.fullscreenType    = type;
    this.fullscreenContent = type;
    document.body.style.overflow = 'hidden';
  }

  closeFullscreen(): void {
    this.fullscreenType    = null;
    this.fullscreenContent = null;
    document.body.style.overflow = 'auto';
  }

  getFullscreenTitle(): string {
    const titles: Record<string, string> = {
      questionText:   'Question Text',
      officialAnswer: 'Official Answer',
    };
    return titles[this.fullscreenType ?? ''] ?? '';
  }

  getFullscreenContent(): string {
    if (!this.currentQuestion) return '';
    switch (this.fullscreenType) {
      case 'questionText':   return this.currentQuestion.questionText;
      case 'officialAnswer': return this.currentQuestion.officialAnswer;
      default:               return '';
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  get canLoad(): boolean {
    return !!this.selectedClass &&
           !!this.selectedSubject &&
           !!this.selectedExamType &&
           !!this.selectedQuestionPaperId &&
           !this.isLoadingPapers;
  }

  private clearPapers(): void {
    this.questionPapers            = [];
    this.selectedQuestionPaperId   = null;
    this.showQuestionPaperDropdown = false;
    this.noExamPaperFound          = false;
    this.questionPaper             = null;
    this.currentQuestion           = null;
  }

  private resetAll(): void {
    this.selectedSubject           = '';
    this.selectedExamType          = '';
    this.subjects                  = [];
    this.examTypes                 = [];
    this.clearPapers();
  }
}