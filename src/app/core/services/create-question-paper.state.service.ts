import { Injectable } from '@angular/core';
import { ExamFormData, QuestionSet } from '../models/exam';
import { ExamTypeDto, SubjectDto } from './master-data.service';

export interface CreateQuestionPaperState {
  examFormData: ExamFormData;
  questionSets: QuestionSet[];
  questionsGenerated: boolean;
  currentQuestionIndex: number;
  examInfoCollapsed: boolean;
  showExamInfoChevron: boolean;
  allSubjects: SubjectDto[];
  allExamTypes: ExamTypeDto[];
}

@Injectable({ providedIn: 'root' })
export class CreateQuestionPaperStateService {

  private _state: CreateQuestionPaperState | null = null;

  /** Save current component state before navigating away */
  save(state: CreateQuestionPaperState): void {
    this._state = JSON.parse(JSON.stringify(state)); // deep clone
  }

  /** Restore saved state when returning to the component */
  restore(): CreateQuestionPaperState | null {
    return this._state;
  }

  /** Check if there is saved state with meaningful progress */
  hasProgress(): boolean {
    if (!this._state) return false;
    const f = this._state.examFormData;
    return !!(f.classId || f.subjectId || this._state.questionsGenerated);
  }

  /** Clear state after successful submit */
  clear(): void {
    this._state = null;
  }
}