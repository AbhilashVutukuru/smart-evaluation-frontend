import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ViewAnswerSheetService {
  private http   = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Builds the URL for downloading/viewing an answer sheet.
   * FIX: removed throw — throwing from a non-observable method is
   * invisible to Angular error handling. Callers should validate
   * their own inputs before calling this. Returns empty string on
   * missing params so template binding fails gracefully.
   */
  getAnswerSheetUrl(
    studentId        : number,
    classId          : number,
    subjectId        : number,
    examTypeId       : number,
    questionPaperId? : number,
  ): string {
    if (!studentId || !classId || !subjectId || !examTypeId) return '';

    // FIX: HttpParams for encoding safety
    let params = new HttpParams()
      .set('classId',   classId)
      .set('subjectId', subjectId)
      .set('examTypeId',examTypeId);

    if (questionPaperId) params = params.set('questionPaperId', questionPaperId);

    return `${this.apiUrl}/student-answer-sheet/download/${studentId}?${params.toString()}`;
  }

  checkAnswerSheetExists(
    studentId : number,
    classId   : number,
    subjectId : number,
    examTypeId: number,
  ): Observable<boolean> {
    // FIX: HttpParams instead of manual string concatenation
    const params = new HttpParams()
      .set('classId',   classId)
      .set('subjectId', subjectId)
      .set('examTypeId',examTypeId);
    return this.http.get<boolean>(
      `${this.apiUrl}/student-answer-sheet/exists/${studentId}`, { params });
  }
}