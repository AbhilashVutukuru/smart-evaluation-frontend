import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class StudentAnswerSheetService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStudentsWithUploadStatus(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number
  ): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.apiUrl}/student-answer-sheet/students?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&examTypeId=${examTypeId}`
    );
  }

  uploadStudentAnswer(formData: FormData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/student-answer-sheet/upload`, formData);
  }

  submitAllStudents(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/student-answer-sheet/submissions`, data);
  }
}