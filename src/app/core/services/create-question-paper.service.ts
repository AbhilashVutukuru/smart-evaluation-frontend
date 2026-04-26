import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ExamFormData,
  ExamApiRequest,
  ExamQuestion,
  ExamRubric,
  QuestionSet,
  RubricPoint,
  QuestionPaperDto,
} from '../models/exam';
import { ApiResponse } from './master-data.service';

export interface ValidationResult {
  isValid: boolean;
  errors : string[];
}

export interface DraftStatusDto {
  questionPaperId:    number;
  questionPaperName:  string;
  classId:            number;
  subjectId:          number;
  examTypeId:         number;
  className:          string;
  subjectName:        string;
  examTypeName:       string;
  totalMarks:         number;
  numberOfQuestions:  number;
  questionsCompleted: number;
  examDate:           string | null;
}

@Injectable({ providedIn: 'root' })
export class CreateQuestionPaperService {
  private http   = inject(HttpClient); // FIX: inject() pattern
  private apiUrl = environment.apiUrl;

  getQuestionPaperForResume(questionPaperId: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/question-paper/${questionPaperId}`)
      .pipe(map(r => r.data));
  }

  // ── Existence Check ────────────────────────────────────────
  checkQuestionPaperExists(
    classId          : number,
    subjectId        : number,
    examTypeId       : number,
    questionPaperName: string | null,
  ): Observable<boolean> {
    const params: Record<string, string | number> = { classId, subjectId, examTypeId };
    if (questionPaperName?.trim()) params['questionPaperName'] = questionPaperName.trim();
    return this.http
      .get<ApiResponse<boolean>>(`${this.apiUrl}/question-paper/exists`, { params })
      .pipe(map(r => r.data ?? false));
  }

  getQuestionPapers(
    classId   : number,
    subjectId : number,
    examTypeId: number,
  ): Observable<ApiResponse<QuestionPaperDto[]>> {
    return this.http.get<ApiResponse<QuestionPaperDto[]>>(
      `${this.apiUrl}/question-paper/all`,
      { params: { classId, subjectId, examTypeId } },
    );
  }

  // ── Question Set Generation ────────────────────────────────
  generateQuestionSets(numberOfQuestions: number, totalMarks: number): QuestionSet[] {
    const marksPerQuestion = Math.floor(totalMarks / numberOfQuestions);
    const remainder        = totalMarks % numberOfQuestions;
    return Array.from({ length: numberOfQuestions }, (_, i) => ({
      questionNumber     : i + 1,
      questionText       : '',
      answerText         : '',
      maxMarks           : marksPerQuestion + (i < remainder ? 1 : 0),
      validationRulesCount: 1,
      rubricPoints       : [{ description: '', marks: null }],
    }));
  }

  // ── Mark Calculations ──────────────────────────────────────
  calculateTotalQuestionMarks(questionSets: QuestionSet[]): number {
    return questionSets.reduce((total, qs) => total + (qs.maxMarks ?? 0), 0);
  }

  calculateValidationMarksTotal(questionSet: QuestionSet): number {
    return questionSet.rubricPoints.reduce((total, rule) => total + (rule.marks ?? 0), 0);
  }

  validateMarksMatch(questionSet: QuestionSet): boolean {
    if (!questionSet.maxMarks) return false;
    return questionSet.maxMarks === this.calculateValidationMarksTotal(questionSet);
  }

  // ── Validation ─────────────────────────────────────────────
  validateQuestionSet(questionSet: QuestionSet): ValidationResult {
    const errors: string[] = [];

    if (!questionSet.questionText?.trim()) errors.push('Question text field is required');
    if (!questionSet.answerText?.trim())   errors.push('Answer field is required');
    if (!questionSet.maxMarks || questionSet.maxMarks <= 0)
      errors.push('Maximum marks field is required and must be greater than 0');
    if (!questionSet.validationRulesCount || questionSet.validationRulesCount < 1)
      errors.push('Validation rules count is required when Maximum marks is greater than 1');

    questionSet.rubricPoints.forEach((rule, i) => {
      const n = i + 1;
      if (!rule.description?.trim())
        errors.push(`Validation Rule ${n}: Description field is required`);
      if (rule.marks === null || rule.marks < 0)
        errors.push(`Validation Rule ${n}: Marks field is required and must be >= 0`);
    });

    return { isValid: errors.length === 0, errors };
  }

  validateExamForm(formData: ExamFormData): ValidationResult {
    if (!formData.classId)    return { isValid: false, errors: ['Class is required'] };
    if (!formData.subjectId)  return { isValid: false, errors: ['Subject is required'] };
    if (!formData.examTypeId) return { isValid: false, errors: ['Exam type is required'] };

    if (formData.examDate) {
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const [y, m, d] = formData.examDate.split('-').map(Number);
      if (new Date(y, m - 1, d) < today)
        return { isValid: false, errors: ['Exam date cannot be in the past'] };
    }

    if (!formData.numberOfQuestions || formData.numberOfQuestions < 1)
      return { isValid: false, errors: ['Please enter a valid number of questions (minimum 1)'] };

    if (!formData.totalMarks || formData.totalMarks < 1)
      return { isValid: false, errors: ['Total marks is required and must be greater than 0'] };

    const totalQuestionMarks = this.calculateTotalQuestionMarks(formData.questionSets);
    if (totalQuestionMarks !== formData.totalMarks)
      return {
        isValid: false,
        errors: [`Sum of all question marks (${totalQuestionMarks}) must equal total exam marks (${formData.totalMarks})`],
      };

    for (let i = 0; i < formData.questionSets.length; i++) {
      const qs     = formData.questionSets[i];
      const result = this.validateQuestionSet(qs);
      if (!result.isValid)
        return { isValid: false, errors: [`Question ${i + 1}: ${result.errors[0]}`] };

      if (!this.validateMarksMatch(qs)) {
        const total = this.calculateValidationMarksTotal(qs);
        return {
          isValid: false,
          errors: [`Question ${i + 1}: Validation marks (${total}) don't match question marks (${qs.maxMarks})`],
        };
      }
    }

    return { isValid: true, errors: [] };
  }

  // ── API Request Builder ────────────────────────────────────
  prepareApiRequest(formData: ExamFormData): ExamApiRequest {
    const questions: ExamQuestion[] = formData.questionSets.map(qs => {
      const isAutoGenerated = qs.maxMarks === 1;
      const rubrics: ExamRubric[] = qs.rubricPoints.map((rule, i) => ({
        criterionOrder : i + 1,
        rubricText     : rule.description,
        maxMarks       : rule.marks ?? 0,
        isAutoGenerated: isAutoGenerated || (rule.isAutoGenerated ?? false),
      }));
      return {
        questionNumber: qs.questionNumber,
        questionText  : qs.questionText,
        maxMarks      : qs.maxMarks ?? 0,
        answerText    : qs.answerText,
        rubrics,
        rubricAdded   : !isAutoGenerated,
      };
    });

    return {
      classId          : parseInt(formData.classId) || 0,
      subjectId        : parseInt(formData.subjectId) || 0,
      examTypeId       : parseInt(formData.examTypeId) || 0,
      totalMarks       : formData.totalMarks ?? 0,
      questionPaperName: formData.questionPaperName?.trim() ?? '',
      examDate         : formData.examDate ? `${formData.examDate}T00:00:00Z` : null,
      questions,
    };
  }

  // ── Check Exists + Create Draft (combined) ────────────────────────────────
  checkExistsAndCreateDraft(dto: {
    classId: number; subjectId: number; examTypeId: number;
    totalMarks: number; numberOfQuestions: number;
    questionPaperName: string; examDate: string | null;
  }): Observable<number> {
    return this.http
      .post<ApiResponse<{ questionPaperId: number }>>(
        `${this.apiUrl}/question-paper/draft`, dto)
      .pipe(
        map(r => r.data!.questionPaperId),
        catchError(err => { throw err; }),
      );
  }

  // ── Draft API ──────────────────────────────────────────────────────────────

  getDraft(): Observable<DraftStatusDto | null> {
    return this.http
      .get<ApiResponse<DraftStatusDto | null>>(`${this.apiUrl}/question-paper/draft`)
      .pipe(map(r => r.data ?? null));
  }

  createDraft(dto: {
    classId: number; subjectId: number; examTypeId: number;
    totalMarks: number; numberOfQuestions: number;
    questionPaperName: string; examDate: string | null;
  }): Observable<number> {
    return this.http
      .post<ApiResponse<{ questionPaperId: number }>>(
        `${this.apiUrl}/question-paper/draft`, dto)
      .pipe(map(r => r.data!.questionPaperId));
  }

  saveQuestion(questionPaperId: number, question: {
    questionNumber: number; questionText: string; answerText: string;
    maxMarks: number; rubricAdded: boolean;
    rubrics: { criterionOrder: number; rubricText: string; maxMarks: number; }[];
  }): Observable<unknown> {
    return this.http
      .put(`${this.apiUrl}/question-paper/${questionPaperId}/question`, question)
      .pipe(catchError(err => { throw err; }));
  }

  deleteQuestion(questionPaperId: number, questionNumber: number): Observable<unknown> {
    return this.http
      .delete(`${this.apiUrl}/question-paper/${questionPaperId}/question/${questionNumber}`)
      .pipe(catchError(err => { throw err; }));
  }

  completeDraft(questionPaperId: number): Observable<unknown> {
    return this.http
      .put(`${this.apiUrl}/question-paper/${questionPaperId}/complete`, {})
      .pipe(catchError(err => { throw err; }));
  }

  discardDraft(questionPaperId: number): Observable<unknown> {
    return this.http
      .delete(`${this.apiUrl}/question-paper/${questionPaperId}/draft`)
      .pipe(catchError(err => { throw err; }));
  }

  // ── CRUD ───────────────────────────────────────────────────
  createExam(apiRequest: ExamApiRequest): Observable<unknown> {
    return this.http
      .post(`${this.apiUrl}/question-paper/create`, apiRequest)
      .pipe(
        catchError(err => { throw err; }),
      );
  }

  updateExam(questionPaperId: number, formData: ExamFormData): Observable<unknown> {
    const payload = {
      totalMarks:        formData.totalMarks,
      questionPaperName: formData.questionPaperName?.trim() ?? '',
      questionsEdited:   true,
      examDate:          formData.examDate ? `${formData.examDate}T00:00:00Z` : null,
      questions: formData.questionSets.map(qs => ({
        questionNumber: qs.questionNumber,
        questionText:   qs.questionText?.trim(),
        answerText:     qs.answerText?.trim(),
        maxMarks:       qs.maxMarks ?? 0,
        rubricAdded:    qs.maxMarks !== 1,
        rubrics: qs.rubricPoints.map((r, i) => ({
          criterionOrder:  i + 1,
          rubricText:      r.description,
          maxMarks:        r.marks ?? 0,
          isAutoGenerated: qs.maxMarks === 1 || (r.isAutoGenerated ?? false),
        })),
      })),
    };
    return this.http
      .put(`${this.apiUrl}/question-paper/${questionPaperId}`, payload)
      .pipe(catchError(err => { throw err; }));
  }

  // ── Helpers ────────────────────────────────────────────────
  getCurrentAcademicYear(): string {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }

  updateDraftHeader(questionPaperId: number, dto: {
    classId?:          number;
    subjectId?:        number;
    examTypeId?:       number;
    questionPaperName?: string;
    totalMarks:        number;
    numberOfQuestions: number;
    examDate:          string | null;
  }): Observable<unknown> {
    return this.http
      .put(`${this.apiUrl}/question-paper/${questionPaperId}/draft-header`, dto)
      .pipe(catchError(err => { throw err; }));
  }
}