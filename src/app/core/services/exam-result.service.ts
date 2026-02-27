import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExamResultService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============================================
  // Get Student List with Statistics
  // ============================================

  getStudentListWithStatistics(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<any> {
    const url = `${this.apiUrl}/exam-result/students-with-statistics?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response?.data) {
          return {
            statistics: response.data.statistics,
            students: response.data.students,
            totalMarks: response.data.totalMarks,
            totalQuestions: response.data.totalQuestions,
            questionNumbers: response.data.questionNumbers,
          };
        }
        return this.getEmptyStudentListResponse();
      }),
      catchError(() => of(this.getEmptyStudentListResponse())),
    );
  }

  private getEmptyStudentListResponse() {
    return {
      statistics: {
        totalStudents: 0,
        absentCount: 0,
        evaluatedCount: 0,
        notEvaluatedCount: 0,
      },
      students: [],
      totalMarks: 0,
      totalQuestions: 0,
      questionNumbers: [],
    };
  }

  // ============================================
  // Get Single Question Details
  // ============================================

  getQuestionDetails(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
    questionNumber: number,
  ): Observable<any> {
    const url = `${this.apiUrl}/exam-result/question-details?studentId=${studentId}&classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}&questionNumber=${questionNumber}`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response?.data) {
          return response.data;
        }
        throw new Error('Question not found');
      }),
    );
  }

  // ============================================
  // Update Question Rubrics
  // ============================================

  updateQuestionRubrics(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
    questionNumber: number,
    rubrics: Array<{
      questionPaperRubricId: number;
      teacherAssignedMarks: number;
      teacherRemarks?: string;
    }>,
  ): Observable<boolean> {
    // Map to backend expected format
    const mappedRubrics = rubrics.map((r) => ({
      questionPaperRubricId: r.questionPaperRubricId,
      marksGiven: r.teacherAssignedMarks,
      remarks: r.teacherRemarks || '',
    }));

    const body = {
      studentId,
      classId,
      subjectId,
      examTypeId,
      questionNumber,
      rubrics: mappedRubrics,
    };

    return this.http
      .put<any>(`${this.apiUrl}/exam-result/update-question-rubrics`, body)
      .pipe(
        map(() => true),
        catchError((error) => {
          console.error('Update rubrics error:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================
  // Download Answer Sheet
  // ============================================

  downloadAnswerSheet(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<Blob> {
    const url = `${this.apiUrl}/student-answer-sheet/download/${studentId}?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
