import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.models';
import {
  StudentListResponse,
  ResultQuestion,
  EvaluationStatistics,
} from '../models/exam-result';

/** Rubric payload sent to the update endpoint */
export interface RubricUpdatePayload {
  questionPaperRubricId: number;
  marksGiven: number;
  remarks: string;
}

/** Request body for the update-question-rubrics endpoint */
interface UpdateRubricsRequest {
  studentId: number;
  classId: number;
  subjectId: number;
  examTypeId: number;
  questionNumber: number;
    questionPaperId: number;
  rubrics: RubricUpdatePayload[];
}

@Injectable({ providedIn: 'root' })
export class ExamResultService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Student List ────────────────────────────────────────────────────────────

  getStudentListWithStatistics(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
    questionPaperId: number,
  ): Observable<StudentListResponse> {
    return this.http
      .get<ApiResponse<StudentListResponse>>(
        `${this.apiUrl}/exam-result/students-with-statistics`,
        { params: { classId, sectionId, subjectId, examTypeId, questionPaperId } },
      )
      .pipe(map((res) => res.data ?? this.emptyStudentListResponse()));
  }

  private emptyStudentListResponse(): StudentListResponse {
    const statistics: EvaluationStatistics = {
      totalStudents: 0,
      absentCount: 0,
      evaluatedCount: 0,
      notEvaluatedCount: 0,
    };
    return { statistics, students: [], totalMarks: 0, totalQuestions: 0, questionNumbers: [] };
  }

  // ─── Question Details ─────────────────────────────────────────────────────────

  getQuestionDetails(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
    questionNumber: number,
    questionPaperId: number,
  ): Observable<ResultQuestion> {
    return this.http
      .get<ApiResponse<ResultQuestion>>(
        `${this.apiUrl}/exam-result/question-details`,
        { params: { studentId, classId, subjectId, examTypeId, questionNumber,questionPaperId  } },
      )
      .pipe(
        map((res) => {
          if (!res?.data) throw new Error('Question not found');
          return res.data;
        }),
      );
  }

  // ─── Update Rubrics ───────────────────────────────────────────────────────────

  updateQuestionRubrics(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
    questionNumber: number,
    questionPaperId: number,   
    rubrics: Array<{ questionPaperRubricId: number; teacherAssignedMarks: number; teacherRemarks?: string }>,
  ): Observable<number> {
    const body: UpdateRubricsRequest = {
      studentId,
      classId,
      subjectId,
      examTypeId,
      questionNumber,
      questionPaperId, 
      rubrics: rubrics.map((r) => ({
        questionPaperRubricId: r.questionPaperRubricId,
        marksGiven: r.teacherAssignedMarks,
        remarks: r.teacherRemarks ?? '',
      })),
    };

    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/exam-result/update-question-rubrics`, body)
      .pipe(
        map((res) => (res.data as any)?.updatedQuestionMarks ?? 0),
        catchError((error) => {
          console.error('Update rubrics error:', error);
          return throwError(() => error);
        }),
      );
  }

  // ─── Download Answer Sheet ────────────────────────────────────────────────────

  downloadAnswerSheet(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/student-answer-sheet/download/${studentId}`,
      { params: { classId, subjectId, examTypeId }, responseType: 'blob' },
    );
  }
}