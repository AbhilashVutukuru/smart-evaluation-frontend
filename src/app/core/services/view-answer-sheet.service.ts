import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViewAnswerSheetService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get answer sheet URL for viewing/downloading
   * ✅ Production: Use environment-based URL
   */
  getAnswerSheetUrl(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number
  ): string {
    // ✅ Validate parameters
    if (!studentId || !classId || !subjectId || !examTypeId) {
      throw new Error('All parameters are required');
    }

    return (
      `${this.apiUrl}/student-answer-sheet/download/${studentId}` +
      `?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`
    );
  }

  /**
   * Check if answer sheet exists before opening
   * ✅ Optional: Verify file exists
   */
  checkAnswerSheetExists(
    studentId: number,
    classId: number,
    subjectId: number,
    examTypeId: number
  ): Observable<boolean> {
    const url = `${this.apiUrl}/student-answer-sheet/exists/${studentId}?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
    return this.http.get<boolean>(url);
  }
}