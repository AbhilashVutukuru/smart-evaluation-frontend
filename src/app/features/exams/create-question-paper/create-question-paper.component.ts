import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService }         from '../../../core/services/toast.service';
import { ErrorHandlerService }  from '../../../core/services/error-handler.service';
import { CreateQuestionPaperService, DraftStatusDto } from '../../../core/services/create-question-paper.service';
import {
  MasterDataService,
  ClassDto,
  SubjectDto,
  ExamTypeDto,
} from '../../../core/services/master-data.service';
import { ExamFormData, QuestionSet } from '../../../core/models/exam';


interface UploadProgress {
  visible: boolean;
  width:   string;
  text:    string;
}

interface ConfirmDialogState {
  title?:        string;
  lines:         string[];
  okLabel:       string;
  cancelLabel?:  string;
  discardLabel?: string;
  isDanger?:     boolean;
  draftDetails?: DraftDetails;
  onOk:          () => void;
  onCancel?:     () => void;
  onDiscard?:    () => void;
}

interface DraftDetails {
  className:    string;
  subjectName:  string;
  examTypeName: string;
  paperName:    string;
  totalMarks:   number;
  questions:    number;
  completed:    number;
  examDate:     string | null;
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
  private route                       = inject(ActivatedRoute);
  private router                      = inject(Router);

  private destroy$ = new Subject<void>();
  private progressTimer?: ReturnType<typeof setTimeout>;

  // ─── Edit mode (navigated from View Question Paper) ───────────────────────
  isEditMode      = false;
  editingPaperId  = 0;
  draftPaperId    = 0; // set after createDraft API call; 0 = no active draft

  // Display name fallbacks when dropdown arrays aren't loaded yet
  displayClassName    = '';
  displaySubjectName  = '';
  displayExamTypeName = '';

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
  isSaving     = false;

  // ─── Snapshot map: questionNumber → JSON of last saved state ─────────────
  private savedSnapshots = new Map<number, string>();

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
    this.isEditMode     = this.route.snapshot.queryParamMap.get('mode') === 'edit';
    this.editingPaperId = +(this.route.snapshot.queryParamMap.get('paperId') ?? 0);

    if (this.isEditMode && !this.router.lastSuccessfulNavigation) {
      this.isEditMode     = false;
      this.editingPaperId = 0;
    }

    this.loadClasses();

    if (this.isEditMode) {
      this.loadEditModeData();
    } else {
      this.checkForIncompleteDraft();
    }

    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  private onBeforeUnload = (): void => { };

  private loadEditModeData(): void {
    if (!this.editingPaperId) return;
    this.isLoading = true;

    this.createQuestionPaperService.getQuestionPaperForResume(this.editingPaperId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paper) => {
          this.isLoading = false;

          this.displayClassName    = paper.className    || '';
          this.displaySubjectName  = paper.subjectName  || '';
          this.displayExamTypeName = paper.examTypeName || '';

          this.examFormData.totalMarks        = paper.totalMarks;
          this.examFormData.numberOfQuestions = paper.totalQuestions ?? paper.questions?.length ?? 0;
          this.examFormData.questionPaperName = paper.questionPaperName || '';
          this.examFormData.examDate          = paper.examDate ? paper.examDate.slice(0, 10) : null;

          const totalQ = this.examFormData.numberOfQuestions ?? 0;
          this.questionSets = Array.from({ length: totalQ }, (_, i) => {
            const q = paper.questions?.find((q: any) => q.questionNumber === i + 1);
            if (q) {
              return {
                questionNumber:       i + 1,
                questionText:         q.questionText || '',
                answerText:           q.officialAnswer || q.answerText || '',
                maxMarks:             q.maxMarks ?? null,
                validationRulesCount: q.rubrics?.length ?? 0,
                rubricPoints: (q.rubrics ?? []).map((r: any) => ({
                  description:     r.rubricText,
                  marks:           r.maxMarks,
                  isAutoGenerated: r.isAutoGenerated,
                })),
              };
            }
            return { questionNumber: i + 1, questionText: '', answerText: '', maxMarks: null, validationRulesCount: null!, rubricPoints: [] };
          });

          this.examFormData.questionSets = this.questionSets;
          this.currentQuestionIndex      = 0;
          this.questionsGenerated        = true;
          this.questionsLocked           = true;
          this.questionsFrozen           = false;
          this.examInfoCollapsed         = true;
          this.showExamInfoChevron       = true;

          this.savedSnapshots.clear();
          this.questionSets.forEach(qs => {
            this.savedSnapshots.set(qs.questionNumber, this.snapshotQuestion(qs));
          });

          const current = this.questionSets[0];
          if (current && current.maxMarks !== 1 && (current.rubricPoints?.length ?? 0) > 0) {
            this.rulesGenerated = true;
          }

          this.masterDataService.getClasses()
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: (classes) => {
              this.allClasses = classes;
              const matched = classes.find(c =>
                c.className.toLowerCase() === this.displayClassName.toLowerCase()
              );
              if (matched) {
                this.examFormData.classId = String(matched.id);
                this.loadSubjectsAndExamTypes(this.examFormData.classId, true);
              }
            }});
        },
        error: (error) => {
          this.isLoading = false;
          this.errorHandler.handle('Failed to load question paper', error);
        },
      });
  }

  private checkForIncompleteDraft(): void {
    this.createQuestionPaperService.getDraft()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (draft) => {
          if (!draft) return;
          this.pendingDiscardId = draft.questionPaperId;
          this.pendingDraft     = draft;

          const showResumeDialog = () => {
            this.confirmDialog = {
              title:        'Unfinished Question Paper',
              lines:        [],
              okLabel:      'Continue',
              cancelLabel:  'Cancel',
              discardLabel: 'Discard',
              isDanger:     false,
              draftDetails: {
                className:    draft.className,
                subjectName:  draft.subjectName,
                examTypeName: draft.examTypeName,
                paperName:    draft.questionPaperName,
                totalMarks:   draft.totalMarks,
                questions:    draft.numberOfQuestions,
                completed:    draft.questionsCompleted,
                examDate:     draft.examDate,
              },
              onOk:      () => this.continuePendingDraft(draft),
              onCancel:  () => { this.pendingDraft = draft; },  // keep draft, close dialog
              onDiscard: () => this.discardDraftWithConfirm(draft, showResumeDialog),
            };
          };
          showResumeDialog();
        },
        error: () => {}
      });
  }

  pendingDiscardId = 0;
  pendingDraft: DraftStatusDto | null = null;

  discardPendingDraft(): void {
    const id = this.pendingDraft?.questionPaperId ?? this.pendingDiscardId ?? this.draftPaperId;
    this.pendingDraft        = null;
    this.draftPaperId        = 0;
    this.pendingDiscardId    = 0;
    this.questionsGenerated  = false;
    this.questionsLocked     = false;
    this.questionsFrozen     = false;
    this.questionSets        = [];
    this.currentQuestionIndex = 0;
    this.savedSnapshots.clear();
    if (id) {
      this.createQuestionPaperService.deleteQuestionPaper(id)
        .pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  discardPendingDraftWithConfirm(): void {
    const name = this.pendingDraft?.questionPaperName ?? 'this question paper';
    const id   = this.pendingDraft?.questionPaperId   ?? this.pendingDiscardId ?? this.draftPaperId;
    if (!id) return;
    this.confirmDialog = {
      title:    'Discard Question Paper?',
      lines:    [
        `"${name}" will be permanently deleted.`,
        'This action cannot be undone.',
      ],
      okLabel:  'Discard',
      isDanger: true,
      onOk:     () => this.discardPendingDraft(),
    };
  }

  continuePendingDraft(draftArg?: DraftStatusDto): void {
    const draft = draftArg ?? this.pendingDraft;
    if (!draft) return;
    this.pendingDraft        = null;
    this.draftPaperId        = draft.questionPaperId;
    this.pendingDiscardId    = 0;
    this.questionsGenerated  = false;
    this.questionsLocked     = false;
    this.questionsFrozen     = false;
    this.examInfoCollapsed   = false;
    this.showExamInfoChevron = false;

    const classId    = String(draft.classId    || '');
    const subjectId  = String(draft.subjectId  || '');
    const examTypeId = String(draft.examTypeId || '');

    // Populate text fields immediately
    this.examFormData.questionPaperName = draft.questionPaperName || '';
    this.examFormData.totalMarks        = draft.totalMarks;
    this.examFormData.numberOfQuestions = draft.numberOfQuestions;
    this.examFormData.examDate          = draft.examDate ? draft.examDate.slice(0, 10) : null;
    this.displayClassName               = draft.className    || '';
    this.displaySubjectName             = draft.subjectName  || '';
    this.displayExamTypeName            = draft.examTypeName || '';

    // Load classes then set all form values atomically - no race condition
    this.masterDataService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (classes) => {
        this.allClasses = classes;
        this.examFormData = {
          academicYear:      this.createQuestionPaperService.getCurrentAcademicYear(),
          classId:           classId,
          subjectId:         '',
          examTypeId:        '',
          questionPaperName: draft.questionPaperName || '',
          totalMarks:        draft.totalMarks,
          numberOfQuestions: draft.numberOfQuestions,
          examDate:          draft.examDate ? draft.examDate.slice(0, 10) : null,
          questionSets:      [],
        };
        this.loadSubjectsAndExamTypes(classId, true);
      }});

    // 0-questions draft — generate blank slots and show Q&A immediately
    if (draft.questionsCompleted === 0) {
      const totalQ = draft.numberOfQuestions;
      this.questionSets = Array.from({ length: totalQ }, (_, i) => ({
        questionNumber:       i + 1,
        questionText:         '',
        answerText:           '',
        maxMarks:             null,
        validationRulesCount: null!,
        rubricPoints:         [],
      }));
      this.examFormData.questionSets = this.questionSets;
      this.currentQuestionIndex      = 0;
      this.questionsGenerated        = true;
      this.questionsLocked           = true;
      this.examInfoCollapsed         = true;
      this.showExamInfoChevron       = true;
      this.toastService.showSuccess('Draft Loaded', `Continue filling ${totalQ} questions.`);
      return;
    }

    // Partial draft — load saved questions
    this.createQuestionPaperService
      .getQuestionPaperForResume(draft.questionPaperId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paper) => {
          const totalQ = draft.numberOfQuestions;
          this.questionSets = Array.from({ length: totalQ }, (_, i) => {
            const saved = paper.questions?.find((q: any) => q.questionNumber === i + 1);
            if (saved) {
              return {
                questionNumber:       i + 1,
                questionText:         saved.questionText || '',
                answerText:           saved.officialAnswer || '',
                maxMarks:             saved.maxMarks ?? null,
                validationRulesCount: saved.rubrics?.length ?? 0,
                rubricPoints: (saved.rubrics ?? []).map((r: any) => ({
                  description: r.rubricText, marks: r.maxMarks,
                })),
              };
            }
            return { questionNumber: i + 1, questionText: '', answerText: '', maxMarks: null, validationRulesCount: null!, rubricPoints: [] };
          });

          const firstEmpty = this.questionSets.findIndex(q => !q.questionText?.trim());
          this.currentQuestionIndex      = firstEmpty >= 0 ? firstEmpty : 0;
          this.examFormData.questionSets = this.questionSets;
          this.questionsGenerated        = true;
          this.questionsLocked           = true;
          this.questionsFrozen           = false;
          this.examInfoCollapsed         = true;
          this.showExamInfoChevron       = true;

          this.savedSnapshots.clear();
          this.questionSets.forEach(qs => {
            if (qs.questionText?.trim()) this.savedSnapshots.set(qs.questionNumber, this.snapshotQuestion(qs));
          });

          const q = this.currentQuestionSet;
          if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) this.rulesGenerated = true;

          this.toastService.showSuccess('Resumed', `Continuing from Question ${this.currentQuestionIndex + 1} of ${totalQ}.`);
        },
        error: () => {
          const totalQ = draft.numberOfQuestions;
          this.questionSets = Array.from({ length: totalQ }, (_, i) => ({
            questionNumber: i + 1, questionText: '', answerText: '', maxMarks: null, validationRulesCount: null!, rubricPoints: [],
          }));
          this.examFormData.questionSets = this.questionSets;
          this.questionsGenerated = true; this.questionsLocked = true;
          this.questionsFrozen = false; this.currentQuestionIndex = 0;
          this.examInfoCollapsed = false; this.showExamInfoChevron = true;
          this.toastService.showSuccess('Resumed', `Continue filling ${totalQ} questions.`);
        },
      });
  }

  confirmDialogCancel(): void {
    const onCancel = this.confirmDialog?.onCancel;
    this.confirmDialog = null;
    onCancel?.();
  }

  confirmDialogDiscard(): void {
    const cb = this.confirmDialog?.onDiscard;
    this.confirmDialog = null;
    cb?.();
  }

  private discardDraftWithConfirm(draft: DraftStatusDto, onBack: () => void): void {
    this.confirmDialog = {
      title:       'Delete Question Paper?',
      lines:       [
        `"${draft.questionPaperName}" will be permanently deleted.`,
        'This action cannot be undone.',
      ],
      okLabel:     'Yes, Delete',
      cancelLabel: 'Back',
      isDanger:    true,
      onOk: () => {
        this.pendingDraft     = null;
        this.pendingDiscardId = 0;
        this.draftPaperId     = 0;
        this.createQuestionPaperService.deleteQuestionPaper(draft.questionPaperId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next:  () => this.toastService.showSuccess('Deleted', 'Question paper deleted successfully.'),
            error: (error) => this.errorHandler.handle('Failed to delete question paper', error),
          });
      },
      onCancel: () => onBack(), // go back to resume dialog
    };
  }

  // ─── FIX: resumeDraft now loads allClasses + allSubjects + allExamTypes ───
  private resumeDraft(draft: DraftStatusDto): void {
    this.draftPaperId     = draft.questionPaperId;
    this.pendingDiscardId = draft.questionPaperId;

    this.createQuestionPaperService
      .getQuestionPaperForResume(draft.questionPaperId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paper) => {
          const totalQ = draft.numberOfQuestions;
          this.questionSets = Array.from({ length: totalQ }, (_, i) => {
            const saved = paper.questions?.find((q: any) => q.questionNumber === i + 1);
            if (saved) {
              return {
                questionNumber:       i + 1,
                questionText:         saved.questionText,
                answerText:           saved.officialAnswer,
                maxMarks:             saved.maxMarks,
                validationRulesCount: saved.rubrics?.length ?? 0,
                rubricPoints: (saved.rubrics ?? []).map((r: any) => ({
                  description:     r.rubricText,
                  marks:           r.maxMarks,
                  isAutoGenerated: r.isAutoGenerated,
                })),
              };
            }
            return { questionNumber: i + 1, questionText: '', answerText: '', maxMarks: null, validationRulesCount: null!, rubricPoints: [] };
          });

          const firstEmpty = this.questionSets.findIndex(q => !q.questionText?.trim());
          this.currentQuestionIndex = firstEmpty >= 0 ? firstEmpty : Math.min(draft.questionsCompleted, totalQ - 1);

          // ── FIX: set IDs so dropdowns bind correctly when user expands Exam Details ──
          const classId    = String(draft.classId    || '');
          const subjectId  = String(draft.subjectId  || '');
          const examTypeId = String(draft.examTypeId || '');

          this.examFormData.questionSets      = this.questionSets;
          this.examFormData.numberOfQuestions = totalQ;
          this.examFormData.totalMarks        = draft.totalMarks;
          this.examFormData.questionPaperName = draft.questionPaperName;
          this.examFormData.examDate          = draft.examDate ? draft.examDate.split('T')[0] : null;
          this.examFormData.classId           = classId;    // ← FIX: was never set
          this.examFormData.subjectId         = subjectId;  // ← FIX: was never set
          this.examFormData.examTypeId        = examTypeId; // ← FIX: was never set

          this.displayClassName    = draft.className    || '';
          this.displaySubjectName  = draft.subjectName  || '';
          this.displayExamTypeName = draft.examTypeName || '';

          this.questionsGenerated  = true;
          this.questionsLocked     = true;
          this.questionsFrozen     = false;
          this.examInfoCollapsed   = true;
          this.showExamInfoChevron = true;

          // ── FIX: load dropdown lists so selects render correctly on expand ──
          if (!this.allClasses.length) {
            this.masterDataService.getClasses()
              .pipe(takeUntil(this.destroy$))
              .subscribe({ next: (classes) => (this.allClasses = classes) });
          }
          if (classId) {
            // IDs already known from draft — no name-matching needed
            this.loadSubjectsAndExamTypes(classId, false);
          }

          // Snapshot all already-saved questions so they won't be re-saved on Next
          this.savedSnapshots.clear();
          this.questionSets.forEach(qs => {
            if (qs.questionText?.trim()) this.savedSnapshots.set(qs.questionNumber, this.snapshotQuestion(qs));
          });

          const q = this.currentQuestionSet;
          if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) {
            this.rulesGenerated = true;
          }

          this.toastService.showSuccess(
            'Draft Resumed',
            `Continuing from Question ${this.currentQuestionIndex + 1} of ${totalQ}.`,
          );
        },
        error: () => {
          this.toastService.showWarning('Warning', 'Could not load draft. Starting fresh.');
        },
      });
  }

  ngOnDestroy(): void {
    clearTimeout(this.progressTimer);
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('beforeunload', this.onBeforeUnload);
  }

  onCancelEdit(): void {
    const paperId  = this.editingPaperId || +(this.route.snapshot.queryParamMap.get('paperId') ?? 0);
    const fromList = this.route.snapshot.queryParamMap.get('fromList') === '1';
    const classId  = this.examFormData.classId;
    if (fromList && classId) {
      this.router.navigate(['/view/exam'], { queryParams: { autoClassId: classId } });
    } else {
      this.router.navigate(['/view/exam'],
        paperId ? { queryParams: { questionPaperId: paperId } } : {}
      );
    }
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
    this.loadSubjectsAndExamTypes(classId, false);
  }

  private resetDependentDropdowns(): void {
    this.examFormData.subjectId  = '';
    this.examFormData.examTypeId = '';
    this.allSubjects             = [];
    this.allExamTypes            = [];
  }

  private loadSubjectsAndExamTypes(classId: string, matchNames = false): void {
    this.masterDataService.getSubjectsByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.allSubjects = subjects;
          if (matchNames && this.displaySubjectName) {
            const match = subjects.find(s =>
              s.subjectName.toLowerCase() === this.displaySubjectName.toLowerCase()
            );
            if (match) this.examFormData.subjectId = String(match.id);
          }
        },
        error: (error) => this.errorHandler.handle('Failed to load subjects', error),
      });

    this.masterDataService.getExamTypesByClass(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (examTypes) => {
          this.allExamTypes = examTypes;
          if (matchNames && this.displayExamTypeName) {
            const match = examTypes.find(e =>
              e.examTypeName.toLowerCase() === this.displayExamTypeName.toLowerCase()
            );
            if (match) this.examFormData.examTypeId = String(match.id);
          }
        },
        error: (error) => this.errorHandler.handle('Failed to load exam types', error),
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

    // Allow letters, digits, single space between words, single hyphen between words
    let val = input.value;
    // Strip disallowed chars — keep letters, digits, space, hyphen
    val = val.replace(/[^a-zA-Z0-9 -]/g, '');
    // No leading space or hyphen
    val = val.replace(/^[ -]+/, '');
    // Collapse multiple spaces into one
    val = val.replace(/ {2,}/g, ' ');
    // Collapse multiple hyphens into one
    val = val.replace(/-{2,}/g, '-');
    // No space immediately after hyphen or hyphen immediately after space
    val = val.replace(/- /g, '-').replace(/ -/g, '-');

    this.examFormData.questionPaperName = val;
    input.value = val;
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
      if (this.questionsLocked) this.onHeaderFieldChanged();
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
      if (this.questionsLocked) this.onHeaderFieldChanged();
    }
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

    // If re-clicking after a freeze: just unlock without regenerating
    if (this.questionsFrozen && this.questionSets.length > 0) {
      const paperId = this.draftPaperId || this.editingPaperId;
      if (paperId) {
        this.createQuestionPaperService.updateDraftHeader(paperId, {
          totalMarks:        this.examFormData.totalMarks!,
          numberOfQuestions: this.examFormData.numberOfQuestions!,
          examDate:          this.examFormData.examDate ? `${this.examFormData.examDate}T00:00:00Z` : null,
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.isLoading       = false;
            this.questionsLocked = true;
            this.questionsFrozen = false;
            this.questionsGenerated = true;
            this.toastService.showSuccess('Updated', 'Question paper header updated. You can continue editing.');
          },
          error: (error) => {
            this.isLoading = false;
            this.errorHandler.handle('Failed to update question paper', error);
          },
        });
      } else {
        this.isLoading       = false;
        this.questionsLocked = true;
        this.questionsFrozen = false;
        this.questionsGenerated = true;
        this.toastService.showSuccess('Validated', 'Question paper validated. You can continue editing.');
      }
      return;
    }

    // Pending draft — must Continue, Cancel (defer) or Discard before creating new paper
    if (this.pendingDraft) {
      this.isLoading = false;
      const draft = this.pendingDraft;
      const showResumeDialog = () => {
        this.confirmDialog = {
          title:        'Unfinished Question Paper',
          lines:        [],
          okLabel:      'Continue',
          cancelLabel:  'Cancel',
          discardLabel: 'Discard',
          isDanger:     false,
          draftDetails: {
            className:    draft.className,
            subjectName:  draft.subjectName,
            examTypeName: draft.examTypeName,
            paperName:    draft.questionPaperName,
            totalMarks:   draft.totalMarks,
            questions:    draft.numberOfQuestions,
            completed:    draft.questionsCompleted,
            examDate:     draft.examDate,
          },
          onOk:      () => this.continuePendingDraft(draft),
          onCancel:  () => { this.pendingDraft = draft; },
          onDiscard: () => this.discardDraftWithConfirm(draft, showResumeDialog),
        };
      };
      showResumeDialog();
      return;
    }

    // Check exists + create draft in one step
    this.createQuestionPaperService.checkExistsAndCreateDraft({
      classId:           +this.examFormData.classId,
      subjectId:         +this.examFormData.subjectId,
      examTypeId:        +this.examFormData.examTypeId,
      totalMarks:        this.examFormData.totalMarks!,
      numberOfQuestions: this.examFormData.numberOfQuestions!,
      questionPaperName: this.examFormData.questionPaperName?.trim() ?? '',
      examDate:          this.examFormData.examDate ? `${this.examFormData.examDate}T00:00:00Z` : null,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (paperId) => {
        this.isLoading    = false;
        this.draftPaperId = paperId;
        this.questionPaperNameExists = false;
        try {
          this.questionSets = this.createQuestionPaperService.generateQuestionSets(
            this.examFormData.numberOfQuestions!,
            this.examFormData.totalMarks!,
          );
          this.questionSets.forEach(q => {
            q.validationRulesCount = 0;
            q.rubricPoints         = [];
            q.maxMarks             = null;
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
            `${this.questionSets.length} questions created. Fill in each question and click Save & Next.`,
          );
        } catch (error) {
          this.errorHandler.handle('Failed to generate questions', error);
        }
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error?.error?.message ?? '';
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
          this.questionPaperNameExists = true;
          this.toastService.showError(
            'Duplicate Question Paper Name',
            'A question paper with the same name already exists for this class, subject, and exam type.\nPlease choose a different name.',
          );
        } else {
          this.errorHandler.handle('Failed to set questions', error);
        }
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
        'This will permanently delete this question paper and all its questions.',
        'This action cannot be undone. Are you sure you want to proceed?',
      ],
      okLabel:     'Yes, Delete',
      cancelLabel: 'Cancel',
      isDanger:    true,
      onOk: () => this.hardResetQuestions(),
    };
  }

  confirmDialogOk(): void {
    const cb = this.confirmDialog?.onOk;
    this.confirmDialog = null;
    cb?.();
  }

  private hardResetQuestions(): void {
    const paperId = this.editingPaperId || this.draftPaperId || this.pendingDiscardId;

    const doReset = () => {
      this.questionsGenerated              = false;
      this.questionsLocked                 = false;
      this.questionsFrozen                 = false;
      this.questionSets                    = [];
      this.examFormData.questionSets       = [];
      this.examFormData.classId            = '';
      this.examFormData.subjectId          = '';
      this.examFormData.examTypeId         = '';
      this.examFormData.totalMarks         = null;
      this.examFormData.numberOfQuestions  = null;
      this.examFormData.questionPaperName  = null;
      this.examFormData.examDate           = null;
      this.allSubjects                     = [];
      this.allExamTypes                    = [];
      this.currentQuestionIndex            = 0;
      this.examInfoCollapsed               = false;
      this.showExamInfoChevron             = false;
      this.rulesGenerated                  = false;
      this.questionPaperNameExists         = false;
      this.savedSnapshots.clear();
      this.draftPaperId     = 0;
      this.pendingDiscardId = 0;
      this.pendingDraft     = null;
      this.editingPaperId   = 0;
      this.isEditMode       = false;
      this.displayClassName    = '';
      this.displaySubjectName  = '';
      this.displayExamTypeName = '';
      this.resetTouchState();
      this.toastService.showSuccess('Deleted', 'Question paper deleted successfully.');
    };

    if (paperId) {
      this.createQuestionPaperService.deleteQuestionPaper(paperId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next:  () => doReset(),
          error: (error) => this.errorHandler.handle('Failed to delete question paper', error),
        });
    } else {
      doReset();
    }
  }

  private resetForm(): void {
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
    const newQ: QuestionSet = {
      questionNumber:       this.questionSets.length + 1,
      questionText:         '',
      answerText:           '',
      maxMarks:             null,
      validationRulesCount: 0,
      rubricPoints:         [],
    };
    this.questionSets.push(newQ);
    this.examFormData.questionSets      = this.questionSets;
    this.examFormData.numberOfQuestions = this.questionSets.length;

    const paperId = this.draftPaperId || this.editingPaperId;
    if (paperId) {
      this.createQuestionPaperService.updateDraftHeader(paperId, {
        classId:           +this.examFormData.classId,
        subjectId:         +this.examFormData.subjectId,
        examTypeId:        +this.examFormData.examTypeId,
        questionPaperName: this.examFormData.questionPaperName?.trim() ?? '',
        totalMarks:        this.examFormData.totalMarks!,
        numberOfQuestions: this.questionSets.length,
        examDate:          this.examFormData.examDate ? `${this.examFormData.examDate}T00:00:00Z` : null,
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => this.toastService.showSuccess('Question Added', `Question ${newQ.questionNumber} added.`),
        error: (error) => this.errorHandler.handle('Failed to add question', error),
      });
    } else {
      this.toastService.showSuccess('Question Added', `Question ${newQ.questionNumber} added.`);
    }
  }

  /**
   * Change #6: Delete the last question (or current if it's last).
   */
  deleteLastQuestion(): void {
    if (this.questionSets.length <= 1) return;
    this.confirmDialog = {
      lines: [
        'Delete the last question?',
        'This will permanently remove the last question.',
      ],
      isDanger:    true,
      okLabel:     'Yes, Delete',
      cancelLabel: 'Cancel',
      onOk: () => {
        const lastQ   = this.questionSets[this.questionSets.length - 1];
        const paperId = this.draftPaperId || this.editingPaperId;

        const doDelete = () => {
          this.questionSets.pop();
          this.examFormData.questionSets      = this.questionSets;
          this.examFormData.numberOfQuestions = this.questionSets.length;
          if (this.currentQuestionIndex >= this.questionSets.length) {
            this.currentQuestionIndex = this.questionSets.length - 1;
          }
          this.resetTouchState();
          this.toastService.showSuccess('Deleted', 'Last question permanently deleted.');
        };

        if (paperId) {
          this.createQuestionPaperService
            .deleteQuestion(paperId, lastQ.questionNumber)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next:  doDelete,
              error: (error) => this.errorHandler.handle('Failed to delete question', error),
            });
        } else {
          doDelete();
        }
      },
    };
  }

  // ─── Question Navigation ──────────────────────────────────────────────────

  private snapshotQuestion(qs: QuestionSet): string {
    return JSON.stringify({
      questionText:  qs.questionText?.trim(),
      answerText:    qs.answerText?.trim(),
      maxMarks:      qs.maxMarks,
      rubricPoints:  qs.rubricPoints.map(r => ({ description: r.description?.trim(), marks: r.marks })),
    });
  }

  hasQuestionChanged(qs: QuestionSet): boolean {
    const saved = this.savedSnapshots.get(qs.questionNumber);
    return saved === undefined || saved !== this.snapshotQuestion(qs);
  }

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
    if (this.currentQuestionIndex === 0 || this.isSaving) return;
    this.currentQuestionIndex--;
    this.resetTouchState();
    const q = this.currentQuestionSet;
    if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) {
      this.rulesGenerated = true;
    }
  }

  goToNextQuestion(): void {
    if (this.isSaving) return;
    this.isSaving = true;

    this.questionTextTouched = true;
    this.answerTextTouched   = true;
    this.currentQuestionSet?.rubricPoints?.forEach(r => {
      r.descriptionTouched = true;
      r.marksTouched       = true;
    });

    if (this.currentQuestionSet.maxMarks === 1) this.autoFillOneMarkQuestion();

    const errors = this.getQuestionValidationErrors();
    if (errors.length > 0) {
      this.isSaving = false;
      this.toastService.showError('Validation Error', errors[0]);
      return;
    }

    if (this.currentQuestionSet.maxMarks !== 1 && !this.validateMarksMatch()) {
      const total = this.calculateValidationMarksTotal();
      const max   = this.currentQuestionSet.maxMarks ?? 0;
      const msg   = total > max
        ? `Validation marks (${total}) exceed maximum marks (${max}). Please adjust.`
        : `Validation marks (${total}) are less than maximum marks (${max}). Please add more.`;
      this.isSaving = false;
      this.toastService.showError('Validation Error', msg);
      return;
    }

    if (this.currentQuestionIndex >= this.questionSets.length - 1) {
      this.isSaving = false;
      return;
    }

    // Save question to DB before moving
    const qs = this.currentQuestionSet;
    const paperId = this.isEditMode ? this.editingPaperId : this.draftPaperId;

    if (paperId) {
      if (!this.hasQuestionChanged(qs)) {
        // Nothing changed — skip API, just navigate
        this.isSaving = false;
        this.advanceToNextQuestion();
        return;
      }
      this.createQuestionPaperService.saveQuestion(paperId, {
        questionNumber: qs.questionNumber,
        questionText:   qs.questionText?.trim(),
        answerText:     qs.answerText?.trim(),
        maxMarks:       qs.maxMarks ?? 0,
        rubricAdded:    qs.maxMarks !== 1,
        rubrics: qs.rubricPoints.map((r, i) => ({
          criterionOrder:  i + 1,
          rubricText:      r.description,
          maxMarks:        r.marks ?? 0,
        })),
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.savedSnapshots.set(qs.questionNumber, this.snapshotQuestion(qs));
          this.isSaving = false;
          this.advanceToNextQuestion();
          this.toastService.showSuccess('Saved', 'Question saved! Moving to next.');
        },
        error: (error) => {
          this.isSaving = false;
          this.errorHandler.handle('Failed to save question', error);
        },
      });
    } else {
      this.isSaving = false;
      this.advanceToNextQuestion();
    }
  }

  private advanceToNextQuestion(): void {
    this.currentQuestionIndex++;
    this.resetTouchState();
    const q = this.currentQuestionSet;
    if (q && q.maxMarks !== 1 && (q.rubricPoints?.length ?? 0) > 0) {
      this.rulesGenerated = true;
    }
  }

  private autoFillOneMarkQuestion(): void {
    this.currentQuestionSet.validationRulesCount = 1;
    this.currentQuestionSet.rubricPoints = [
      { description: 'Default criterion', marks: 1, isAutoGenerated: true },
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

    if (this.isEditMode) {
      this.saveChangesToBackend();
    } else {
      this.submitToBackend();
    }
  }

  private saveChangesToBackend(): void {
    if (!this.editingPaperId) {
      this.toastService.showError('Error', 'No paper ID found for editing'); return;
    }

    this.isSubmitting   = true;
    this.uploadProgress = { visible: true, width: '50%', text: 'Saving question...' };

    const qs = this.currentQuestionSet;

    this.createQuestionPaperService.saveQuestion(this.editingPaperId, {
      questionNumber: qs.questionNumber,
      questionText:   qs.questionText?.trim(),
      answerText:     qs.answerText?.trim(),
      maxMarks:       qs.maxMarks ?? 0,
      rubricAdded:    qs.maxMarks !== 1,
      rubrics: qs.rubricPoints.map((r, i) => ({
        criterionOrder:  i + 1,
        rubricText:      r.description,
        maxMarks:        r.marks ?? 0,
      })),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.savedSnapshots.set(qs.questionNumber, this.snapshotQuestion(qs));
        this.uploadProgress = { visible: true, width: '100%', text: 'Saved!' };
        this.progressTimer = setTimeout(() => {
          this.uploadProgress.visible = false;
          this.isSubmitting           = false;
          this.toastService.showSuccess('Saved', 'Question saved successfully');
        }, 500);
      },
      error: (error) => {
        this.uploadProgress.visible = false;
        this.isSubmitting           = false;
        this.errorHandler.handle('Failed to save question', error);
      },
    });
  }

  private submitToBackend(): void {
    this.isSubmitting   = true;
    this.uploadProgress = { visible: true, width: '30%', text: 'Saving last question...' };

    const qs      = this.currentQuestionSet;
    const paperId = this.draftPaperId;

    if (!paperId) {
      this.toastService.showError('Error', 'No draft found. Please click Set Questions again.');
      this.isSubmitting = false;
      this.uploadProgress.visible = false;
      return;
    }

    // Save the last question first, then complete
    this.createQuestionPaperService.saveQuestion(paperId, {
      questionNumber: qs.questionNumber,
      questionText:   qs.questionText?.trim(),
      answerText:     qs.answerText?.trim(),
      maxMarks:       qs.maxMarks ?? 0,
      rubricAdded:    qs.maxMarks !== 1,
      rubrics: qs.rubricPoints.map((r, i) => ({
        criterionOrder:  i + 1,
        rubricText:      r.description,
        maxMarks:        r.marks ?? 0,
      })),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.uploadProgress = { visible: true, width: '70%', text: 'Submitting question paper...' };
        this.createQuestionPaperService.completeDraft(paperId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.uploadProgress = { visible: true, width: '100%', text: 'Submitted successfully!' };
              this.progressTimer = setTimeout(() => {
                this.uploadProgress.visible = false;
                this.isSubmitting           = false;
                this.draftPaperId           = 0;
                this.toastService.showSuccess('Success', 'Question paper submitted successfully!');
                this.resetForm();
              }, 500);
            },
            error: (error) => {
              this.uploadProgress.visible = false;
              this.isSubmitting           = false;
              this.errorHandler.handle('Failed to submit question paper', error);
            },
          });
      },
      error: (error) => {
        this.uploadProgress.visible = false;
        this.isSubmitting           = false;
        this.errorHandler.handle('Failed to save last question', error);
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

  addRule(): void {
    const qs = this.currentQuestionSet;
    if (!qs || qs.rubricPoints.length >= 20) return;
    qs.rubricPoints.push({ description: '', marks: null });
    qs.validationRulesCount = qs.rubricPoints.length;
  }

  removeRule(index: number): void {
    const qs = this.currentQuestionSet;
    if (!qs || qs.rubricPoints.length <= 1) return;
    qs.rubricPoints.splice(index, 1);
    qs.validationRulesCount = qs.rubricPoints.length;
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
  getClassName():    string { return this.allClasses.find(c  => String(c.id)  === String(this.examFormData.classId))?.className    || this.displayClassName    || ''; }
  getSubjectName():  string { return this.allSubjects.find(s => String(s.id)  === String(this.examFormData.subjectId))?.subjectName  || this.displaySubjectName  || ''; }
  getExamTypeName(): string { return this.allExamTypes.find(e => String(e.id) === String(this.examFormData.examTypeId))?.examTypeName || this.displayExamTypeName || ''; }

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
  onQuestionTextChange(): void { if (this.questionTextTouched && this.currentQuestionSet?.questionText?.trim()) this.questionTextTouched = false; }
  onAnswerTextChange():   void { if (this.answerTextTouched   && this.currentQuestionSet?.answerText?.trim())   this.answerTextTouched   = false; }

  get questionTextInvalid(): boolean { return this.questionTextTouched && (!this.currentQuestionSet?.questionText?.trim()); }
  get answerTextInvalid():   boolean { return this.answerTextTouched   && (!this.currentQuestionSet?.answerText?.trim());   }

  onMaxMarksInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (isNaN(value)) return;
    const max = this.examFormData.totalMarks ?? 200;
    if (value < 1)   value = 1;
    if (value > max) value = max;
    this.currentQuestionSet.maxMarks = value;
    input.value = String(value);
    // Reset rules so user must click Set Validation Rules again
    this.rulesGenerated = false;
    this.currentQuestionSet.rubricPoints = [];
    this.currentQuestionSet.validationRulesCount = null!;
  }

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

  onValidationCountChange(event?: Event | null): void {
    if (!event) return; // called from spinner buttons — count already set directly
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