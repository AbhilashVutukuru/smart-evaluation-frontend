import { Component, inject, OnDestroy } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExamResultService }  from '../../../core/services/exam-result.service';
import {
  StudentResultInfo,
  ExamResult,
  ResultQuestion,
  ResultRubric,
  EvaluationStatistics,
} from '../../../core/models/exam-result';
import { ExamFilterComponent }       from '../exam-filter/exam-filter.component';
import { BaseExamFilterComponent }   from '../base/base-exam-filter.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule, ExamFilterComponent, RouterModule],
  templateUrl: './exam-result.component.html',
  styleUrls: ['./exam-result.component.css'],
})
export class ExamResultsComponent extends BaseExamFilterComponent implements OnDestroy {
  private examResultService = inject(ExamResultService);
  private route             = inject(ActivatedRoute);

  // ─── Student data ─────────────────────────────────────────────────────────
  students: StudentResultInfo[] = [];
  selectedStudent: StudentResultInfo | null = null;

  // ─── Exam metadata ────────────────────────────────────────────────────────
  totalMarks     = 0;
  totalQuestions = 0;
  questionNumbers: number[] = [];
  statistics: EvaluationStatistics = {
    totalStudents: 0, absentCount: 0, evaluatedCount: 0, notEvaluatedCount: 0,
  };

  answerSheetsSubmitted = false;
  liveObtainedMarks: number | null = null;

  get displayObtainedMarks(): number {
    return this.liveObtainedMarks ?? this.selectedStudent?.obtainedMarks ?? 0;
  }

  // ─── Current question data ────────────────────────────────────────────────
  currentResults:      ExamResult | null    = null;
  currentQuestion:     ResultQuestion | null = null;
  currentQuestionIndex = 0;

  // ─── UI state ─────────────────────────────────────────────────────────────
  isLoading         = false;
  isLoadingQuestion = false;
  isViewing         = false;
  showResultsCard   = false;
  searchCompleted   = false;
  isFilterCollapsed = false;
  hasSearched       = false;

  // ─── Table search ─────────────────────────────────────────────────────────
  searchTerm        = '';
  filteredStudents: StudentResultInfo[] = [];

  // ─── Fullscreen modal ─────────────────────────────────────────────────────
  fullscreenContent: string | null = null;
  fullscreenType:    string | null = null;

  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Chip label overrides (from query params) ─────────────────────────────
  chipClassName         = '';
  chipSectionName       = '';
  chipSubjectName       = '';
  chipExamTypeName      = '';
  chipQuestionPaperName = '';

  // FIX: use destroy$ from base class — base class creates and completes it
  // Subclass ngOnDestroy must call super.ngOnDestroy()
  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  override ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(p => {
        if (p['classId'] && p['sectionId'] && p['subjectId'] && p['examTypeId'] && p['questionPaperId']) {
          this.selectedClass             = p['classId'];
          this.selectedSection           = p['sectionId'];
          this.selectedSubject           = p['subjectId'];
          this.selectedExamType          = p['examTypeId'];
          this.selectedQuestionPaperId   = +p['questionPaperId'];
          this.showQuestionPaperDropdown = true;

          this.students              = [];
          this.filteredStudents      = [];
          this.searchTerm            = '';
          this.selectedStudent       = null;
          this.currentResults        = null;
          this.currentQuestion       = null;
          this.showStudentsCard      = false;
          this.showResultsCard       = false;
          this.searchCompleted       = false;
          this.hasSearched           = false;
          this.answerSheetsSubmitted = false;
          this.isFilterCollapsed     = true;
          this.statistics = { totalStudents: 0, absentCount: 0, evaluatedCount: 0, notEvaluatedCount: 0 };

          forkJoin({
            classes:   this.masterDataService.getClasses(),
            sections:  this.masterDataService.getSectionsByClass(p['classId']),
            subjects:  this.masterDataService.getSubjectsByClass(p['classId']),
            examTypes: this.masterDataService.getExamTypesByClass(p['classId']),
            papers:    this.createQuestionPaperService.getQuestionPapers(
                         +p['classId'], +p['subjectId'], +p['examTypeId']),
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ classes, sections, subjects, examTypes, papers }) => {
              this.classes        = classes;
              this.sections       = sections;
              this.subjects       = subjects;
              this.examTypes      = examTypes;
              this.questionPapers = papers.data ?? [];
            },
            error: (err) => this.errorHandler.handle('Failed to load filter options', err),
          });

          const autoStudentId = p['studentId'] ? +p['studentId'] : null;

          if (autoStudentId) {
            this.isLoading         = true;
            this.isLoadingQuestion = true;

            forkJoin({
              list: this.examResultService.getStudentListWithStatistics(
                +p['classId'], +p['sectionId'], +p['subjectId'], +p['examTypeId'], +p['questionPaperId']),
              q1: this.examResultService.getQuestionDetails(
                autoStudentId, +p['classId'], +p['subjectId'], +p['examTypeId'], 1, +p['questionPaperId']),
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: ({ list, q1 }) => {
                this.students              = list.students;
                this.filteredStudents      = [...list.students];
                this.statistics            = list.statistics;
                this.totalMarks            = list.totalMarks;
                this.totalQuestions        = list.totalQuestions;
                this.questionNumbers       = list.questionNumbers;
                this.answerSheetsSubmitted = list.answerSheetsSubmitted ?? false;
                this.hasSearched           = true;
                this.isFilterCollapsed     = true;
                this.isLoading             = false;

                const target = list.students.find(s => s.studentId === autoStudentId);
                if (target) {
                  this.selectedStudent   = target;
                  this.liveObtainedMarks = null;
                  this.currentResults    = {
                    studentId:        target.studentId,
                    studentName:      target.studentName,
                    totalMarks:       list.totalMarks,
                    questions:        [],
                    isAbsent:         target.isAbsent,
                    evaluationStatus: target.evaluationStatus,
                  };
                  this.currentQuestionIndex = 0;
                  this.showStudentsCard     = false;
                  this.showResultsCard      = true;
                  this.currentQuestion      = q1;
                  this.initializeRubrics();
                }
                this.isLoadingQuestion = false;
              },
              error: (err) => {
                this.isLoading         = false;
                this.isLoadingQuestion = false;
                this.errorHandler.handle('Failed to load results', err);
              },
            });

          } else {
            this.showStudents();
          }

        } else {
          super.ngOnInit();
        }
      });
  }

  loadDropdownsLazy(): void {}

  // ─── Abstract implementation ──────────────────────────────────────────────
  protected override clearStudents(): void {
    this.students              = [];
    this.filteredStudents      = [];
    this.searchTerm            = '';
    this.selectedStudent       = null;
    this.currentResults        = null;
    this.currentQuestion       = null;
    this.showStudentsCard      = false;
    this.showResultsCard       = false;
    this.searchCompleted       = false;
    this.hasSearched           = false;
    this.answerSheetsSubmitted = false;
    this.isFilterCollapsed     = false;
    this.statistics = { totalStudents: 0, absentCount: 0, evaluatedCount: 0, notEvaluatedCount: 0 };
  }

  // ─── Table search ─────────────────────────────────────────────────────────
  onSearchInput(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.filteredStudents = [...this.students]; return; }
    this.filteredStudents = this.students.filter(s =>
      s.studentName?.toLowerCase().includes(term) ||
      String(s.rollNumber).toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm       = '';
    this.filteredStudents = [...this.students];
  }

  onFiltersChanged(): void { this.clearStudents(); }

  // ─── Get Students ─────────────────────────────────────────────────────────
  showStudents(autoOpenStudentId: number | null = null): void {
    if (!this.validateSelection()) return;

    this.isLoading        = true;
    this.noExamPaperFound = false;

    this.examResultService
      .getStudentListWithStatistics(
        +this.selectedClass, +this.selectedSection,
        +this.selectedSubject, +this.selectedExamType,
        this.selectedQuestionPaperId!,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.students              = response.students;
          this.filteredStudents      = [...response.students];
          this.statistics            = response.statistics;
          this.totalMarks            = response.totalMarks;
          this.totalQuestions        = response.totalQuestions;
          this.questionNumbers       = response.questionNumbers;
          this.answerSheetsSubmitted = response.answerSheetsSubmitted ?? false;
          this.showStudentsCard      = true;
          this.showResultsCard       = false;
          this.searchCompleted       = true;
          this.isLoading             = false;
          this.hasSearched           = true;
          this.isFilterCollapsed     = true;
          this.noExamPaperFound      = this.students.length === 0;

          if (autoOpenStudentId) {
            const target = response.students.find(s => s.studentId === autoOpenStudentId);
            if (target && target.evaluationStatus === 'Evaluated') {
              this.viewStudentResults(target);
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorHandler.handleHttpError(error, 'Failed to load students', () => {
            this.noExamPaperFound = true;
            this.students         = [];
            this.showStudentsCard = true;
          });
        },
      });
  }

  // ─── View Student Results ─────────────────────────────────────────────────
  viewStudentResults(student: StudentResultInfo): void {
    this.selectedStudent     = student;
    this.liveObtainedMarks   = null;
    this.showStudentsCard    = false;
    this.showResultsCard     = true;
    this.currentResults      = {
      studentId:        student.studentId,
      studentName:      student.studentName,
      totalMarks:       this.totalMarks,
      questions:        [],
      isAbsent:         student.isAbsent,
      evaluationStatus: student.evaluationStatus,
    };
    this.currentQuestionIndex = 0;

    if (this.totalQuestions > 0 && !student.isAbsent) {
      this.loadQuestion(0);
    }
  }

  backToStudentsList(): void {
    this.selectedStudent      = null;
    this.currentResults       = null;
    this.currentQuestion      = null;
    this.currentQuestionIndex = 0;
    this.liveObtainedMarks    = null;
    this.showResultsCard      = false;
    this.showStudents();
  }

  // ─── Question Navigation ──────────────────────────────────────────────────
  loadQuestion(index: number, scroll = false): void {
    if (!this.selectedStudent) return;
    if (index < 0 || index >= this.totalQuestions) {
      this.toastService.showError('Error', 'Invalid question index'); return;
    }

    this.isLoadingQuestion = true;

    this.examResultService
      .getQuestionDetails(
        this.selectedStudent.studentId,
        +this.selectedClass, +this.selectedSubject, +this.selectedExamType,
        index + 1, this.selectedQuestionPaperId!,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (question: ResultQuestion) => {
          this.currentQuestion      = question;
          this.currentQuestionIndex = index;
          this.initializeRubrics();
          this.isLoadingQuestion    = false;
          if (scroll) {
            setTimeout(() => {
              const el = document.getElementById('quick-jump');
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }, 50);
          }
        },
        error: (error) => {
          this.isLoadingQuestion = false;
          this.errorHandler.handle('Failed to load question', error);
        },
      });
  }

  private initializeRubrics(): void {
    if (!this.currentQuestion?.rubrics) return;
    this.currentQuestion.rubrics.forEach((rubric: ResultRubric) => {
      rubric.isEditing = false;
      if (rubric.marksAssignedByTeacher && rubric.marksAssignedByTeacher > 0) {
        rubric.marksGiven      = rubric.marksAssignedByTeacher;
        rubric.teacherModified = true;
      } else {
        rubric.marksGiven      = rubric.marksAssignedBySystem ?? 0;
        rubric.teacherModified = false;
      }
      rubric.originalMarksGiven = rubric.marksGiven;
      rubric.originalRemarks    = rubric.teacherRemarks ?? '';
    });
  }

  nextQuestion():     void { if (this.currentQuestionIndex < this.totalQuestions - 1) this.loadQuestion(this.currentQuestionIndex + 1, true); }
  previousQuestion(): void { if (this.currentQuestionIndex > 0) this.loadQuestion(this.currentQuestionIndex - 1, true); }

  getProgressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    return ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
  }

  // ─── Rubric Editing ───────────────────────────────────────────────────────
  enableRubricEdit(rubric: ResultRubric): void {
    rubric.isEditing          = true;
    rubric.originalMarksGiven = rubric.marksGiven;
    rubric.originalRemarks    = rubric.teacherRemarks;
  }

  cancelRubricEdit(rubric: ResultRubric): void {
    rubric.isEditing      = false;
    rubric.marksGiven     = rubric.originalMarksGiven ?? 0;
    rubric.teacherRemarks = rubric.originalRemarks;
  }

  isRubricValid(rubric: ResultRubric): boolean {
    if (rubric.marksGiven < 0 || rubric.marksGiven > rubric.maxMarks) return false;
    if (!rubric.teacherRemarks?.trim()) return false;
    const marksStr = rubric.marksGiven.toString();
    if (marksStr.includes('.')) {
      const decimal = marksStr.split('.')[1];
      if (decimal && decimal.length > 1) return false;
    }
    return true;
  }

  saveRubric(rubric: ResultRubric): void {
    if (!this.selectedStudent || !this.currentQuestion) {
      this.toastService.showWarning('Warning', 'No question selected'); return;
    }
    if (!this.isRubricValid(rubric)) {
      this.toastService.showError('Error', 'Please enter valid marks (0.5 step) and remarks'); return;
    }
    if (!this.isRubricChanged(rubric)) {
      rubric.isEditing = false;
      this.toastService.showInfo('Info', 'No changes to save'); return;
    }

    rubric.isSaving = true;
    this.isLoading  = true;

    this.examResultService
      .updateQuestionRubrics(
        this.selectedStudent.studentId,
        +this.selectedClass, +this.selectedSubject, +this.selectedExamType,
        this.currentQuestion.questionNumber,
        this.selectedQuestionPaperId!,
        [{
          questionPaperRubricId: rubric.questionPaperRubricId ?? rubric.id!,
          teacherAssignedMarks:  rubric.marksGiven,
          teacherRemarks:        rubric.teacherRemarks?.trim(),
        }],
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (totalObtainedMarks: number) => {
          rubric.isEditing          = false;
          rubric.teacherModified    = true;
          rubric.originalMarksGiven = rubric.marksGiven;
          rubric.originalRemarks    = rubric.teacherRemarks;
          rubric.isSaving           = false;
          this.isLoading            = false;
          this.liveObtainedMarks    = totalObtainedMarks;
          this.toastService.showSuccess('Success', 'Marks saved successfully!');
        },
        error: (error) => {
          rubric.isSaving = false;
          this.isLoading  = false;
          this.errorHandler.handle('Failed to save marks', error);
        },
      });
  }

  isRubricChanged(rubric: ResultRubric): boolean {
    if (!rubric.isEditing) return false;
    const marksChanged   = Number(rubric.marksGiven)  !== Number(rubric.originalMarksGiven);
    // FIX: was `marksChanged && remarksChanged` — should be OR.
    // A rubric change should save if EITHER marks OR remarks changed, not both.
    const remarksChanged = (rubric.teacherRemarks ?? '').trim() !== (rubric.originalRemarks ?? '').trim();
    return marksChanged || remarksChanged;
  }

  // ─── Fullscreen Modal ─────────────────────────────────────────────────────
  openFullscreen(type: string): void {
    this.fullscreenType            = type;
    this.fullscreenContent         = type;
    document.body.style.overflow   = 'hidden';
  }

  closeFullscreen(): void {
    this.fullscreenContent       = null;
    this.fullscreenType          = null;
    document.body.style.overflow = 'auto';
  }

  getFullscreenTitle(): string {
    const titles: Record<string, string> = {
      questionText:  'Question Text',
      officialAnswer: 'Official Answer',
      studentAnswer: "Student's Answer",
    };
    return titles[this.fullscreenType ?? ''] ?? '';
  }

  getFullscreenContent(): string {
    if (!this.currentQuestion) return '';
    switch (this.fullscreenType) {
      case 'questionText':   return this.currentQuestion.questionText;
      case 'officialAnswer': return this.currentQuestion.officialAnswer;
      case 'studentAnswer':  return this.currentQuestion.studentAnswerText ?? 'Not answered';
      default:               return '';
    }
  }

  // ─── View Answer Sheet ────────────────────────────────────────────────────
  viewAnswerSheet(student: StudentResultInfo): void {
    if (!student.documentUrl && !student.fileName) {
      this.toastService.showWarning('Warning', 'Answer sheet not available'); return;
    }
    this.openAnswerSheet(student.studentId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  getPercentage(): number {
    if (!this.selectedStudent || !this.totalMarks) return 0;
    return Math.round((this.displayObtainedMarks / this.totalMarks) * 100);
  }

  isAnyRubricEditing(): boolean {
    return this.currentQuestion?.rubrics?.some((r: ResultRubric) => r.isEditing) ?? false;
  }

  getTotalRubricMarks(): number {
    return this.currentQuestion?.rubrics?.reduce(
      (sum: number, r: ResultRubric) => sum + (r.marksGiven ?? 0), 0,
    ) ?? 0;
  }

  restrictToHalfStep(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!/^\d*(\.(0|5)?)?$/.test(input.value)) {
      input.value = input.value.slice(0, -1);
    }
  }
}