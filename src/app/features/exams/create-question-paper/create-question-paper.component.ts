import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService }         from '../../../core/services/toast.service';
import { ErrorHandlerService }  from '../../../core/services/error-handler.service';
import { CreateQuestionPaperService } from '../../../core/services/create-question-paper.service';
import {
  MasterDataService,
  ClassDto,
  SubjectDto,
  ExamTypeDto,
} from '../../../core/services/master-data.service';
import { ExamFormData, QuestionSet } from '../../../core/models/exam';
import { CreateQuestionPaperStateService } from '../../../core/services/create-question-paper.state.service';

interface UploadProgress {
  visible: boolean;
  width:   string;
  text:    string;
}

interface ConfirmDialogState {
  lines:    string[];
  okLabel:  string;
  onOk:     () => void;
}

@Component({
  selector: 'app-exam-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-question-paper.component.html',
  styleUrls: ['./create-question-paper.component.css'],
})
export class CreateExamComponent implements OnInit, OnDestroy {
  private toastService                = inject(ToastService);
  private errorHandler                = inject(ErrorHandlerService);
  private createQuestionPaperService  = inject(CreateQuestionPaperService);
  private masterDataService           = inject(MasterDataService);
  private stateService                = inject(CreateQuestionPaperStateService);

  private destroy$ = new Subject<void>();
  private progressTimer?: ReturnType<typeof setTimeout>;

  // ─── Mode state ───────────────────────────────────────────────────────────
  questionsGenerated    = false;
  currentQuestionIndex  = 0;
  examInfoCollapsed     = false;
  showExamInfoChevron   = false;

  /**
   * questionsLocked: Set Questions has been clicked & API confirmed no duplicate.
   * While locked, Set Questions button is disabled; Reset button appears.
   * numberOfQuestions input is also disabled.
   */
  questionsLocked = false;

  /**
   * questionsFrozen: Header field changed after lock. Q&A inputs are disabled;
   * user must click Set Questions again to re-validate.
   */
  questionsFrozen = false;

  // ─── Loading states ───────────────────────────────────────────────────────
  isLoading    = false;
  isSubmitting = false;

  // ─── Touch/validation state ───────────────────────────────────────────────
  questionTextTouched = false;
  answerTextTouched   = false;
  rulesGenerated      = false;

  // ─── Dropdown data ────────────────────────────────────────────────────────
  allClasses:   ClassDto[]    = [];
  allSubjects:  SubjectDto[]  = [];
  allExamTypes: ExamTypeDto[] = [];

  // ─── Question sets ────────────────────────────────────────────────────────
  questionSets: QuestionSet[] = [];

  // ─── Upload progress ──────────────────────────────────────────────────────
  uploadProgress: UploadProgress = { visible: false, width: '0%', text: '' };

  // ─── Confirm dialog ───────────────────────────────────────────────────────
  confirmDialog: ConfirmDialogState | null = null;

  // ─── Duplicate name flag ──────────────────────────────────────────────────
  questionPaperNameExists = false;

  // ─── Form data ────────────────────────────────────────────────────────────
  examFormData: ExamFormData = {
    academicYear:      this.createQuestionPaperService.getCurrentAcademicYear(),
    classId:           '',
    subjectId:         '',
    examTypeId:        '',
    totalMarks:        null,
    numberOfQuestions: null,
    questionPaperName: null,
    examDate:          null,
    questionSets:      [],
  };

  // ─── Date helpers ─────────────────────────────────────────────────────────
  get todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  isExamDateInPast(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const selected  = new Date(y, m - 1, d);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadClasses();
    this.restoreState();
  }

  ngOnDestroy(): void {
    clearTimeout(this.progressTimer);
    this.saveState();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private saveState(): void {
    this.stateService.save({
      examFormData:         this.examFormData,
      questionSets:         this.questionSets,
      questionsGenerated:   this.questionsGenerated,
      currentQuestionIndex: this.currentQuestionIndex,
      examInfoCollapsed:    this.examInfoCollapsed,
      showExamInfoChevron:  this.showExamInfoChevron,
      allSubjects:          this.allSubjects,
      allExamTypes:         this.allExamTypes,
      questionsLocked:      this.questionsLocked,
      questionsFrozen:      this.questionsFrozen,
    });
  }

  private restoreState(): void {
    const saved = this.stateService.restore();
    if (!saved) return;
    this.examFormData         = saved.examFormData;
    this.questionSets         = saved.questionSets;
    this.questionsGenerated   = saved.questionsGenerated;
    this.currentQuestionIndex = saved.currentQuestionIndex;
    this.examInfoCollapsed    = saved.examInfoCollapsed;
    this.showExamInfoChevron  = saved.showExamInfoChevron;
    this.allSubjects          = saved.allSubjects;
    this.allExamTypes         = saved.allExamTypes;
    this.questionsLocked      = saved.questionsLocked  ?? (saved.questionsGenerated ? true : false);
    this.questionsFrozen      = saved.questionsFrozen  ?? false;
    this.examFormData.questionSets = this.questionSets;
  }

  // ─── Load Initial Data ────────────────────────────────────────────────────

  private loadClasses(): void {
    this.masterDataService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (classes) => (this.allClasses = classes),
        error: (error)   => this.errorHandler.handle('Failed to load classes', error),
      });
  }

  // ─── Dropdown Change Handlers ─────────────────────────────────────────────

  onClassSelected(classId: string): void {
    this.resetDependentDropdowns();
    this.onHeaderFieldChanged();
    if (!classId) return;
    this.loadSubjectsAndExamTypes(classId);
  }

  private resetDependentDropdowns(): void {
    this.examFormData.subjectId  = '';
    this.examFormData.examTypeId = '';
    this.allSubjects             = [];
    this.allExamTypes            = [];
  }

  private loadSubjectsAndExamTypes(classId: string): void {
    this.masterDataService.getSubjectsByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (subjects) => (this.allSubjects = subjects),
        error: (error)    => this.errorHandler.handle('Failed to load subjects', error),
      });

    this.masterDataService.getExamTypesByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (examTypes) => (this.allExamTypes = examTypes),
        error: (error)     => this.errorHandler.handle('Failed to load exam types', error),
      });
  }

  onSubjectChange():  void { this.onHeaderFieldChanged(); }
  onExamTypeChange(): void { this.onHeaderFieldChanged(); }

  /**
   * Change #8: Question Paper Name input handler.
   * Strips digits from the base text portion (before the last hyphen-number suffix).
   * Allows patterns like "UnitTest-6" — only the suffix number is preserved.
   */
  onQuestionPaperNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let raw = input.value;

    // Split on last hyphen followed by digits at end of string
    const suffixMatch = raw.match(/^(.*?)(-\d+)$/);
    if (suffixMatch) {
      // Has a numeric suffix like "-6": strip digits from base, keep suffix
      const base   = suffixMatch[1].replace(/\d/g, '');
      const suffix = suffixMatch[2];
      raw = base + suffix;
    } else {
      // No numeric suffix: strip all digits from the whole value
      raw = raw.replace(/\d/g, '');
    }

    this.examFormData.questionPaperName = raw;
    input.value = raw;
    this.questionPaperNameExists = false;
    this.onHeaderFieldChanged();
  }

  onQuestionPaperNameChange(): void {
    this.questionPaperNameExists = false;
    this.onHeaderFieldChanged();
  }

  onTotalMarksChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      if (value < 1)   value = 1;
      if (value > 200) value = 200;
      this.examFormData.totalMarks = value;
      input.value = String(value);
    }
  }

  onNumberOfQuestionsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      if (value < 1)  value = 1;
      if (value > 50) value = 50;
      this.examFormData.numberOfQuestions = value;
      input.value = String(value);
    }
    // numberOfQuestions is disabled when locked, so this only fires pre-lock
  }

  /**
   * Called when Class / Subject / ExamType / QuestionPaperName changes.
   * If questions are already locked: unlock Set Questions (so user re-validates),
   * and freeze the Q&A section (inputs disabled, notice shown).
   * The questionSets data is NOT cleared — just frozen.
   */
  private onHeaderFieldChanged(): void {
    if (this.questionsLocked) {
      this.questionsLocked = false;
      this.questionsFrozen = true;
    }
  }

  // ─── Generate Questions ───────────────────────────────────────────────────

  generateQuestions(): void {
    if (!this.validateExamBasicInfo()) return;

    this.isLoading = true;

    this.createQuestionPaperService
      .checkQuestionPaperExists(
        +this.examFormData.classId,
        +this.examFormData.subjectId,
        +this.examFormData.examTypeId,
        this.examFormData.questionPaperName?.trim() ?? null,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          this.isLoading = false;
          if (exists) {
            this.questionPaperNameExists = true;
            this.toastService.showError(
              'Duplicate Question Paper Name',
              'A question paper with the same name already exists for this class, subject, and exam type.\nPlease choose a different name.',
            );
            return;
          }
          this.questionPaperNameExists = false;

          // If re-clicking after a freeze: just unlock and unfreeze without regenerating
          if (this.questionsFrozen && this.questionSets.length > 0) {
            this.questionsLocked  = true;
            this.questionsFrozen  = false;
            this.questionsGenerated = true;
            this.toastService.showSuccess('Validated', 'Question paper validated. You can continue editing.');
            return;
          }

          try {
            this.questionSets = this.createQuestionPaperService.generateQuestionSets(
              this.examFormData.numberOfQuestions!,
              this.examFormData.totalMarks!,
            );
            this.questionSets.forEach(q => {
              q.validationRulesCount = 0;
              q.rubricPoints = [];
              q.maxMarks = null;
            });
            this.examFormData.questionSets = this.questionSets;
            this.questionsGenerated        = true;
            this.questionsLocked           = true;
            this.questionsFrozen           = false;
            this.currentQuestionIndex      = 0;
            this.examInfoCollapsed         = true;
            this.showExamInfoChevron       = true;
            this.toastService.showSuccess(
              'Questions Generated',
              `${this.questionSets.length} questions created successfully`,
            );
          } catch (error) {
            this.errorHandler.handle('Failed to generate questions', error);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorHandler.handle('Failed to check question paper', error);
        },
      });
  }

  private validateExamBasicInfo(): boolean {
    if (!this.examFormData.classId)    { this.toastService.showWarning('Warning', 'Please select a class'); return false; }
    if (!this.examFormData.subjectId)  { this.toastService.showWarning('Warning', 'Please select a subject'); return false; }
    if (!this.examFormData.examTypeId) { this.toastService.showWarning('Warning', 'Please select an exam type'); return false; }
    if (!this.examFormData.questionPaperName?.trim()) {
      this.toastService.showWarning('Warning', 'Please enter a Question Paper Name'); return false;
    }
    if (!this.examFormData.totalMarks || this.examFormData.totalMarks < 1) {
      this.toastService.showError('Error', 'Please enter valid total marks (minimum 1)'); return false;
    }
    if (!this.examFormData.numberOfQuestions || this.examFormData.numberOfQuestions < 1) {
      this.toastService.showError('Error', 'Please enter valid number of questions (minimum 1)'); return false;
    }
    return true;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  onResetClick(): void {
    this.confirmDialog = {
      lines: [
        'Are you sure you want to reset?',
        'All entered question and answer data will be lost.',
      ],
      okLabel: 'Yes, Reset',
      onOk: () => this.hardResetQuestions(),
    };
  }

  confirmDialogOk(): void {
    const cb = this.confirmDialog?.onOk;
    this.confirmDialog = null;
    cb?.();
  }

  confirmDialogCancel(): void {
    this.confirmDialog = null;
  }

  private hardResetQuestions(): void {
    this.questionsGenerated   = false;
    this.questionsLocked      = false;
    this.questionsFrozen      = false;
    this.questionSets         = [];
    this.examFormData.questionSets = [];
    this.currentQuestionIndex = 0;
    this.examInfoCollapsed    = false;
    this.showExamInfoChevron  = false;
    this.rulesGenerated       = false;
    this.questionPaperNameExists = false;
    // NOTE: intentionally keep classId, subjectId, examTypeId,
    // questionPaperName, numberOfQuestions, totalMarks — user only resets Q&A
    this.resetTouchState();
    this.toastService.showInfo('Reset', 'Questions have been reset. You can click Set Questions again.');
  }

  private resetForm(): void {
    this.stateService.clear();
    this.examFormData = {
      academicYear:      this.createQuestionPaperService.getCurrentAcademicYear(),
      classId:           '',
      subjectId:         '',
      examTypeId:        '',
      totalMarks:        null,
      numberOfQuestions: null,
      questionPaperName: null,
      examDate:          null,
      questionSets:      [],
    };
    this.questionSets         = [];
    this.questionsGenerated   = false;
    this.questionsLocked      = false;
    this.questionsFrozen      = false;
    this.currentQuestionIndex = 0;
    this.examInfoCollapsed    = false;
    this.showExamInfoChevron  = false;
    this.rulesGenerated       = false;
    this.allSubjects          = [];
    this.allExamTypes         = [];
  }

  // ─── Add / Delete Question ────────────────────────────────────────────────

  /**
   * Change #6: Add a new blank question at the end.
   */
  addQuestion(): void {
    const defaultMarks = this.examFormData.totalMarks
      ? Math.max(2, Math.floor(this.examFormData.totalMarks / (this.questionSets.length + 1)))
      : 2;
    const newQ: QuestionSet = {
      questionNumber:      this.questionSets.length + 1,
      questionText:        '',
      answerText:          '',
      maxMarks:            null,
      validationRulesCount: 0,
      rubricPoints:        [],
    };
    this.questionSets.push(newQ);
    this.examFormData.questionSets = this.questionSets;
    this.examFormData.numberOfQuestions = this.questionSets.length;
    this.toastService.showSuccess('Question Added', `Question ${newQ.questionNumber} added.`);
  }

  /**
   * Change #6: Delete the last question (or current if it's last).
   */
  deleteLastQuestion(): void {
    if (this.questionSets.length <= 1) return;
    this.confirmDialog = {
      lines: [
        'Delete the last question?',
        'Any data entered for it will be lost.',
      ],
      okLabel: 'Yes, Delete',
      onOk: () => {
        this.questionSets.pop();
        this.examFormData.questionSets = this.questionSets;
        this.examFormData.numberOfQuestions = this.questionSets.length;
        if (this.currentQuestionIndex >= this.questionSets.length) {
          this.currentQuestionIndex = this.questionSets.length - 1;
        }
        this.resetTouchState();
        this.toastService.showInfo('Question Deleted', 'Last question removed.');
      },
    };
  }

  // ─── Question Navigation ──────────────────────────────────────────────────

  get currentQuestionSet(): QuestionSet { return this.questionSets[this.currentQuestionIndex]; }
  get isLastQuestion(): boolean { return this.currentQuestionIndex === this.questionSets.length - 1; }

  get shouldShowValidationRules(): boolean {
    return (
      !!this.currentQuestionSet &&
      this.currentQuestionSet.maxMarks !== 1 &&
      this.rulesGenerated &&
      (this.currentQuestionSet.rubricPoints?.length ?? 0) > 0
    );
  }

  /**
   * Change #9: Save & Next is only shown when question + answer are filled
   * (and for multi-mark: validation rules are set and marks match).
   */
  isCurrentQuestionReady(): boolean {
    if (!this.currentQuestionSet) return false;
    const q = this.currentQuestionSet;
    if (!q.questionText?.trim() || !q.answerText?.trim()) return false;
    if (q.maxMarks === 1) return true;
    // For multi-mark: validation rules must be generated and marks must match
    if (!this.rulesGenerated || (q.rubricPoints?.length ?? 0) === 0) return false;
    return this.createQuestionPaperService.validateMarksMatch(q);
  }

  goToPreviousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.resetTouchState();
      const q = this.currentQuestionSet;
      if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) {
        this.rulesGenerated = true;
      }
    }
  }

  goToNextQuestion(): void {
    this.questionTextTouched = true;
    this.answerTextTouched   = true;
    this.currentQuestionSet?.rubricPoints?.forEach(r => {
      r.descriptionTouched = true;
      r.marksTouched       = true;
    });

    if (this.currentQuestionSet.maxMarks === 1) this.autoFillOneMarkQuestion();

    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) { this.toastService.showError('Validation Error', errors[0]); return; }

    if (this.currentQuestionSet.maxMarks !== 1 && !this.validateMarksMatch()) {
      const total = this.calculateValidationMarksTotal();
      const max   = this.currentQuestionSet.maxMarks ?? 0;
      const msg   = total > max
        ? `Validation marks (${total}) exceed maximum marks (${max}). Please adjust.`
        : `Validation marks (${total}) are less than maximum marks (${max}). Please add more.`;
      this.toastService.showError('Validation Error', msg);
      return;
    }

    if (this.currentQuestionIndex < this.questionSets.length - 1) {
      this.currentQuestionIndex++;
      this.resetTouchState();
      const q = this.currentQuestionSet;
      if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) {
        this.rulesGenerated = true;
      }
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
    this.rulesGenerated = true;
  }

  // ─── Submit Exam ──────────────────────────────────────────────────────────

  submitAll(): void {
    this.questionTextTouched = true;
    this.answerTextTouched   = true;
    this.currentQuestionSet?.rubricPoints?.forEach(r => {
      r.descriptionTouched = true;
      r.marksTouched       = true;
    });

    const currentErrors = this.getQuestionValidationErrors();
    if (currentErrors.length > 0) { this.toastService.showError('Validation Error', currentErrors[0]); return; }

    if (!this.validateMarksMatch()) {
      this.toastService.showError('Validation Error', 'Validation marks must match maximum marks'); return;
    }

    const formValidation = this.createQuestionPaperService.validateExamForm(this.examFormData);
    if (!formValidation.isValid) {
      this.toastService.showError('Validation Error', formValidation.errors[0]); return;
    }

    this.submitToBackend();
  }

  private submitToBackend(): void {
    this.isSubmitting   = true;
    this.uploadProgress = { visible: true, width: '50%', text: 'Uploading exam...' };

    this.questionSets.forEach(q => {
      q.questionText = q.questionText?.trim() ?? q.questionText;
      q.answerText   = q.answerText?.trim()   ?? q.answerText;
    });

    const apiRequest = this.createQuestionPaperService.prepareApiRequest(this.examFormData);

    this.createQuestionPaperService.createExam(apiRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.uploadProgress = { visible: true, width: '100%', text: 'Upload complete!' };
          this.progressTimer = setTimeout(() => {
            this.uploadProgress.visible = false;
            this.isSubmitting           = false;
            this.toastService.showSuccess('Success', 'Exam uploaded successfully');
            this.resetForm();
          }, 500);
        },
        error: (error) => {
          this.uploadProgress.visible = false;
          this.isSubmitting           = false;
          this.errorHandler.handle('Failed to upload exam', error);
        },
      });
  }

  // ─── Validation Rules ─────────────────────────────────────────────────────

  generateValidationRules(): void {
    if (!this.currentQuestionSet) { this.toastService.showError('Error', 'No question selected'); return; }

    const maxMarks = this.currentQuestionSet.maxMarks;
    if (!maxMarks || maxMarks < 1) {
      this.toastService.showWarning('Warning', 'Please enter Maximum Marks before setting validation rules'); return;
    }

    const rulesCount = this.currentQuestionSet.validationRulesCount;
    if (!rulesCount || rulesCount < 1) {
      this.toastService.showWarning('Warning', 'Please enter validation rules count first'); return;
    }
    if (rulesCount > 20) {
      this.toastService.showWarning('Warning', 'Maximum 20 validation rules allowed'); return;
    }

    const current = this.currentQuestionSet.rubricPoints;
    while (current.length < rulesCount)  current.push({ description: '', marks: null });
    if (current.length > rulesCount) this.currentQuestionSet.rubricPoints = current.slice(0, rulesCount);

    this.rulesGenerated = true;
  }

  clearCurrentQuestion(): void {
    if (!this.currentQuestionSet) return;
    this.currentQuestionSet.questionText         = '';
    this.currentQuestionSet.answerText           = '';
    this.currentQuestionSet.maxMarks             = null;
    this.currentQuestionSet.validationRulesCount = 0;
    this.currentQuestionSet.rubricPoints         = [];
    this.resetTouchState();
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

  // ─── Name getters ─────────────────────────────────────────────────────────
  getClassName():    string { return this.allClasses.find(c  => String(c.id)  === String(this.examFormData.classId))?.className    ?? ''; }
  getSubjectName():  string { return this.allSubjects.find(s => String(s.id)  === String(this.examFormData.subjectId))?.subjectName  ?? ''; }
  getExamTypeName(): string { return this.allExamTypes.find(e => String(e.id) === String(this.examFormData.examTypeId))?.examTypeName ?? ''; }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return dateString; }
  }

  trackByIndex(index: number): number { return index; }

  // ─── Touch helpers ────────────────────────────────────────────────────────
  onQuestionTextBlur():   void { this.questionTextTouched = true; }
  onAnswerTextBlur():     void { this.answerTextTouched   = true; }
  onQuestionTextChange(): void { if (this.questionTextTouched && this.currentQuestionSet.questionText?.trim()) this.questionTextTouched = false; }
  onAnswerTextChange():   void { if (this.answerTextTouched   && this.currentQuestionSet.answerText?.trim())   this.answerTextTouched   = false; }

  get questionTextInvalid(): boolean { return this.questionTextTouched && (!this.currentQuestionSet.questionText?.trim()); }
  get answerTextInvalid():   boolean { return this.answerTextTouched   && (!this.currentQuestionSet.answerText?.trim());   }

  get canSetRules(): boolean {
    if (!this.currentQuestionSet) return false;
    const count    = this.currentQuestionSet.validationRulesCount;
    const maxMarks = this.currentQuestionSet.maxMarks;
    const hasValidCount    = count    !== null && count    !== undefined && count    >= 1 && count    <= 20;
    const hasValidMaxMarks = maxMarks !== null && maxMarks !== undefined && maxMarks >= 1;
    return hasValidCount && hasValidMaxMarks;
  }

  private resetTouchState(): void {
    this.questionTextTouched = false;
    this.answerTextTouched   = false;
    this.rulesGenerated      = false;
  }

  onValidationCountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (isNaN(value) || value < 1) {
      this.currentQuestionSet.validationRulesCount = 0;
      this.currentQuestionSet.rubricPoints = [];
      this.rulesGenerated = false;
      input.value = '';
      return;
    }
    if (value > 20) {
      value = 20;
      input.value = '20';
    }
    this.currentQuestionSet.validationRulesCount = value;
  }
}