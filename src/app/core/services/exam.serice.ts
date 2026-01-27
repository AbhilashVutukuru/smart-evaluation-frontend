import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get exam types from master-data endpoint
  getExamTypes(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/master-data/exam-types`);
  }

  // Upload question paper with questions and rubrics
  uploadQuestionPaper(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/exams/question-paper/upload`, data);
  }
}