import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExamResultService } from '../../../core/services/exam-result.service';

import {
  StudentResultInfo,
  ExamResult,
  ResultQuestion,
  ResultRubric,
  EvaluationStatistics,
} from '../../../core/models/exam-result';
import { ExamFilterComponent } from '../exam-filter/exam-filter.component';
import { BaseExamFilterComponent } from '../base/base-exam-filter.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule, ExamFilterComponent, RouterModule],
  templateUrl: './exam-result.component.html',
  styleUrls: ['./exam-result.component.css'],
})
export class ExamResultsComponent extends BaseExamFilterComponent {
  private examResultService = inject(ExamResultService);
  private route             = inject(ActivatedRoute);

  // ─── Student data ─────────────────────────────────────────────────────────────
  students: StudentResultInfo[] = [];
  selectedStudent: StudentResultInfo | null = null;

  // ─── Exam metadata ────────────────────────────────────────────────────────────
  totalMarks     = 0;
  totalQuestions = 0;
  questionNumbers: number[] = [];
  statistics: EvaluationStatistics = {
    totalStudents: 0, absentCount: 0, evaluatedCount: 0, notEvaluatedCount: 0,
  };

  // Whether the answer sheet batch was submitted for evaluation
  answerSheetsSubmitted = false;

  // Live total obtained marks — updated from API after each rubric save
  liveObtainedMarks: number | null = null;

  get displayObtainedMarks(): number {
    return this.liveObtainedMarks ?? this.selectedStudent?.obtainedMarks ?? 0;
  }

  // ─── Current question data ────────────────────────────────────────────────────
  currentResults:       ExamResult | null     = null;
  currentQuestion:      ResultQuestion | null = null;
  currentQuestionIndex  = 0;

  // ─── UI state ─────────────────────────────────────────────────────────────────
  isLoading        = false;
  isLoadingQuestion = false;
  isViewing        = false;
  showResultsCard  = false;
  searchCompleted  = false;
  isFilterCollapsed = false;
  hasSearched       = false;

  // ─── Table search ─────────────────────────────────────────────────────────────
  searchTerm       = '';
  filteredStudents: StudentResultInfo[] = [];

  // ─── Fullscreen modal ─────────────────────────────────────────────────────────
  fullscreenContent: string | null = null;
  fullscreenType:    string | null = null;

  // ─── Exposed from base ────────────────────────────────────────────────────────
  override get canShowStudents(): boolean { return super.canShowStudents; }

  // ─── Auto-populate from query params (navigated from View Results button) ──────
  override ngOnInit(): void {
    const p = this.route.snapshot.queryParams;
    if (p['classId'] && p['sectionId'] && p['subjectId'] && p['examTypeId'] && p['questionPaperId']) {

      // Set all selected values first
      this.selectedClass           = p['classId'];
      this.selectedSection         = p['sectionId'];
      this.selectedSubject         = p['subjectId'];
      this.selectedExamType        = p['examTypeId'];
      this.selectedQuestionPaperId = +p['questionPaperId'];
      // Force question paper dropdown visible with the pre-selected paper
      this.showQuestionPaperDropdown = true;

      // Load all dropdowns in parallel for display — without calling onChange
      // (onChange methods reset selectedValues and cause async race conditions)
      this.masterDataService.getClasses().subscribe({
        next: (classes) => (this.classes = classes),
        error: (err)    => this.errorHandler.handle('Failed to load classes', err),
      });
      this.masterDataService.getSectionsByClass(p['classId']).subscribe({
        next: (sections) => (this.sections = sections),
        error: (err)     => this.errorHandler.handle('Failed to load sections', err),
      });
      this.masterDataService.getSubjectsByClass(p['classId']).subscribe({
        next: (subjects) => (this.subjects = subjects),
        error: (err)     => this.errorHandler.handle('Failed to load subjects', err),
      });
      this.masterDataService.getExamTypesByClass(p['classId']).subscribe({
        next: (examTypes) => (this.examTypes = examTypes),
        error: (err)      => this.errorHandler.handle('Failed to load exam types', err),
      });
      this.createQuestionPaperService
        .getQuestionPapers(+p['classId'], +p['subjectId'], +p['examTypeId'])
        .subscribe({
          next: (response) => {
            this.questionPapers = response.data ?? [];
            // Keep the pre-selected questionPaperId — do NOT let handleQuestionPapersResponse reset it
          },
          error: (err) => this.errorHandler.handle('Failed to load question papers', err),
        });

      // showStudents() — all IDs already set, fires immediately
      this.showStudents();

    } else {
      // No query params — normal navigation, let base handle init
      super.ngOnInit();
    }
  }

  // ─── Abstract implementation ──────────────────────────────────────────────────
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

  // ─── Table search ─────────────────────────────────────────────────────────────
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

  // ─── Clear list on any filter change ────────────────────────────────────────
  onFiltersChanged(): void {
    this.clearStudents();
  }

  // ─── Get Students ─────────────────────────────────────────────────────────────

  showStudents(): void {
    if (!this.validateSelection()) return;

    this.isLoading = true;
    this.noExamPaperFound = false;

    this.examResultService
      .getStudentListWithStatistics(
        +this.selectedClass,
        +this.selectedSection,
        +this.selectedSubject,
        +this.selectedExamType,
        this.selectedQuestionPaperId!,
      )
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
        },
        error: (error) => {
          this.isLoading = false;
          this.errorHandler.handleHttpError(error, 'Failed to load students', () => {
            this.noExamPaperFound = true;
            this.students = [];
            this.showStudentsCard = true;
          });
        },
      });
  }

  // ─── View Student Results ─────────────────────────────────────────────────────

  viewStudentResults(student: StudentResultInfo): void {
    this.selectedStudent     = student;
    this.liveObtainedMarks   = null;
    this.showStudentsCard    = false;
    this.showResultsCard     = true;
    this.currentResults   = {
      studentId: student.studentId,
      studentName: student.studentName,
      totalMarks: this.totalMarks,
      questions: [],
      isAbsent: student.isAbsent,
      evaluationStatus: student.evaluationStatus,
    };
    this.currentQuestionIndex = 0;

    if (this.totalQuestions > 0 && !student.isAbsent) {
      this.loadQuestion(0);
    }
  }

  backToStudentsList(): void {
    this.selectedStudent       = null;
    this.currentResults        = null;
    this.currentQuestion       = null;
    this.currentQuestionIndex  = 0;
    this.liveObtainedMarks     = null;
    this.showResultsCard       = false;
    this.showStudents();
  }

  // ─── Question Navigation ──────────────────────────────────────────────────────

  loadQuestion(index: number, scroll = false): void {
    if (!this.selectedStudent) return;
    if (index < 0 || index >= this.totalQuestions) {
      this.toastService.showError('Error', 'Invalid question index');
      return;
    }

    this.isLoadingQuestion = true;

    this.examResultService
      .getQuestionDetails(
        this.selectedStudent.studentId,
        +this.selectedClass,
        +this.selectedSubject,
        +this.selectedExamType,
        index + 1,
        this.selectedQuestionPaperId!,
      )
      .subscribe({
        next: (question: ResultQuestion) => {
          this.currentQuestion      = question;
          this.currentQuestionIndex = index;
          this.initializeRubrics();
          this.isLoadingQuestion = false;
          // Only scroll when navigating (Next/Previous/QuickJump), not on first load
          if (scroll) {
            setTimeout(() => {
              const el = document.getElementById('question-top');
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
        rubric.marksGiven    = rubric.marksAssignedByTeacher;
        rubric.teacherModified = true;
      } else {
        rubric.marksGiven    = rubric.marksAssignedBySystem ?? 0;
        rubric.teacherModified = false;
      }

      rubric.originalMarksGiven = rubric.marksGiven;
      rubric.originalRemarks    = rubric.remarks ?? '';
    });
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.loadQuestion(this.currentQuestionIndex + 1, true);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.loadQuestion(this.currentQuestionIndex - 1, true);
    }
  }

  getProgressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    return ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
  }

  // ─── Rubric Editing ───────────────────────────────────────────────────────────

  enableRubricEdit(rubric: ResultRubric): void {
    rubric.isEditing         = true;
    rubric.originalMarksGiven = rubric.marksGiven;
    rubric.originalRemarks   = rubric.remarks;
  }

  cancelRubricEdit(rubric: ResultRubric): void {
    rubric.isEditing  = false;
    rubric.marksGiven = rubric.originalMarksGiven ?? 0;
    rubric.remarks    = rubric.originalRemarks;
  }

  isRubricValid(rubric: ResultRubric): boolean {
    if (rubric.marksGiven < 0 || rubric.marksGiven > rubric.maxMarks) return false;
    if (!rubric.remarks?.trim()) return false;

    const marksStr = rubric.marksGiven.toString();
    if (marksStr.includes('.')) {
      const decimal = marksStr.split('.')[1];
      if (decimal && decimal.length > 1) return false;
    }
    return true;
  }

  saveRubric(rubric: ResultRubric): void {
    if (!this.selectedStudent || !this.currentQuestion) {
      this.toastService.showWarning('Warning', 'No question selected');
      return;
    }

    if (!this.isRubricValid(rubric)) {
      this.toastService.showError('Error', 'Please enter valid marks (0.5 step) and remarks');
      return;
    }

    if (!this.isRubricChanged(rubric)) {
      rubric.isEditing = false;
      this.toastService.showInfo('Info', 'No changes to save');
      return;
    }

    rubric.isSaving = true;
    this.isLoading  = true;

    this.examResultService
      .updateQuestionRubrics(
        this.selectedStudent.studentId,
        +this.selectedClass,
        +this.selectedSubject,
        +this.selectedExamType,
        this.currentQuestion.questionNumber,
         this.selectedQuestionPaperId!,
        [{
          questionPaperRubricId: rubric.questionPaperRubricId ?? rubric.id!,
          teacherAssignedMarks:  rubric.marksGiven,
          teacherRemarks:        rubric.remarks?.trim(),
        }],
      )
      .subscribe({
        next: (totalObtainedMarks: number) => {
          rubric.isEditing          = false;
          rubric.teacherModified    = true;
          rubric.originalMarksGiven = rubric.marksGiven;
          rubric.originalRemarks    = rubric.remarks;
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
    const marksChanged   = Number(rubric.marksGiven) !== Number(rubric.originalMarksGiven);
    const remarksChanged = (rubric.remarks ?? '').trim() !== (rubric.originalRemarks ?? '').trim();
    return marksChanged && remarksChanged;
  }

  // ─── Fullscreen Modal ─────────────────────────────────────────────────────────

  openFullscreen(type: string): void {
    this.fullscreenType    = type;
    this.fullscreenContent = type;
    document.body.style.overflow = 'hidden';
  }

  closeFullscreen(): void {
    this.fullscreenContent = null;
    this.fullscreenType    = null;
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

  // ─── View Answer Sheet ────────────────────────────────────────────────────────

  viewAnswerSheet(student: StudentResultInfo): void {
    if (!student.documentUrl && !student.fileName) {
      this.toastService.showWarning('Warning', 'Answer sheet not available');
      return;
    }
    this.openAnswerSheet(student.studentId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

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