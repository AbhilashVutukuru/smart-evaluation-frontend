import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class TeacherSubjectService {
  private http   = inject(HttpClient); // FIX: inject() pattern
  private apiUrl = environment.apiUrl;

  assignSubjectsToTeacher(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/teacher-subjects/assign`, data);
  }

  getTeacherAssignments(teacherId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/teacher-subjects/teacher/${teacherId}`);
  }

  removeAssignment(assignmentId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/teacher-subjects/${assignmentId}`);
  }
}