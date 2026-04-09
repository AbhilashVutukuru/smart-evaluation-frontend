import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViewAnswerSheetService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAnswerSheetUrl(
    studentId:       number,
    classId:         number,
    subjectId:       number,
    examTypeId:      number,
    questionPaperId?: number
  ): string {
    if (!studentId || !classId || !subjectId || !examTypeId) {
      throw new Error('All parameters are required');
    }

    let url = `${this.apiUrl}/student-answer-sheet/download/${studentId}` +
              `?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;

    if (questionPaperId) {
      url += `&questionPaperId=${questionPaperId}`;
    }

    return url;
  }

  checkAnswerSheetExists(
    studentId:  number,
    classId:    number,
    subjectId:  number,
    examTypeId: number
  ): Observable<boolean> {
    const url = `${this.apiUrl}/student-answer-sheet/exists/${studentId}` +
                `?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
    return this.http.get<boolean>(url);
  }
}