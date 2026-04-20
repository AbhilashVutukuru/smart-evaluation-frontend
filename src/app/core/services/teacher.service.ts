import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private http   = inject(HttpClient); // FIX: inject() pattern
  private apiUrl = environment.apiUrl;

  getTeachers(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/teacher`);
  }

  getTeacherById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/teacher/${id}`);
  }

  updateTeacher(data: any): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/teacher/${data.id}`, data);
  }

  deleteTeacher(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/teacher/${id}`);
  }
}