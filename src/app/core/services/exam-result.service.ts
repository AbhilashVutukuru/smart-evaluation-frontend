import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { StudentInfo, ExamResult, ExamQuestion } from '../models/exam-result';

const API_URL = 'http://localhost:5163/api';

@Injectable({
  providedIn: 'root',
})
export class ExamResultService {
  constructor(private http: HttpClient) {}

  // Get students from API
  getStudents(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<StudentInfo[]> {
    const url = `${API_URL}/exam-result/students?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(() => {
        return of([]);
      }),
    );
  }

  // Get exam results OVERVIEW for a student (NO full question details)
  getExamResults(
    studentId: number,
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<ExamResult> {
    const url = `${API_URL}/exam-result/student-details?studentId=${studentId}&classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        return { questions: [] };
      }),
      catchError(() => {
        return of({ questions: [] });
      }),
    );
  }

  // Get SINGLE question details (PAGINATION) - NEW METHOD
  getQuestionDetails(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number,
    questionNumber: number,
  ): Observable<ExamQuestion> {
    const url = `${API_URL}/exam-result/question-details?studentId=${studentId}&classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}&questionNumber=${questionNumber}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        throw new Error('Question not found');
      }),
    );
  }

  // Update marks for a SINGLE question - NEW METHOD
  updateQuestionMarks(
    studentId: number,
    questionNumber: number,
    questionUpdates: { [key: number]: number },
  ): Observable<boolean> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    });

    return this.http
      .put<any>(
        `${API_URL}/exam-result/update-question-marks`,
        {
          studentId: studentId,
          questionNumber: questionNumber,
          marks: questionUpdates,
        },
        { headers },
      )
      .pipe(
        map(() => true),
        catchError((error) => {
          console.error('Error updating question marks:', error);
          return of(false);
        }),
      );
  }

  // Update marks for ALL questions (final submit)
  updateMarks(
    studentId: number,
    questionUpdates: { [key: number]: number },
  ): Observable<boolean> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    });

    return this.http
      .put<any>(
        `${API_URL}/exam-result/update-marks`,
        {
          studentId: studentId,
          marks: questionUpdates,
        },
        { headers },
      )
      .pipe(
        map(() => true),
        catchError((error) => {
          console.error('Error updating marks:', error);
          return of(false);
        }),
      );
  }

  updateQuestionRubrics(
  studentId: number,
  classId: number,
  subjectId: number,
  examTypeId: number,
  questionNumber: number,
  rubrics: Array<{ questionPaperRubricId: number; marksGiven: number }>
): Observable<boolean> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
  });

  const body = {
    studentId: studentId,
    classId: classId,
    subjectId: subjectId,
    examTypeId: examTypeId,
    questionNumber: questionNumber,
    rubrics: rubrics
  };

  console.log('API Request:', body);

  return this.http.put<any>(
    `${API_URL}/exam-result/update-question-rubrics`,
    body,
    { headers }
  ).pipe(
    map(response => {
      console.log('API Response:', response);
      return true;
    }),
    catchError(error => {
      console.error('API Error:', error);
      return of(false);
    })
  );
}
}
