import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AdminSettingsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Class operations
  getClasses(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/classes`);
  }

  createClass(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/classes`, data);
  }

  deleteClass(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-settings/classes/${id}`);
  }

  // Section operations
  getSections(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/sections`);
  }

  createSection(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/sections`, data);
  }

  deleteSection(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-settings/sections/${id}`);
  }

  // Subject operations
  getSubjects(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/subjects`);
  }

  createSubject(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/subjects`, data);
  }

  deleteSubject(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-settings/subjects/${id}`);
  }

  // ExamType operations
  getExamTypes(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/exam-types`);
  }

  createExamType(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/exam-types`, data);
  }

  deleteExamType(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-settings/exam-types/${id}`);
  }

  // Academic Year operations
  getAcademicYears(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/academic-years`);
  }

  createAcademicYear(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/academic-years`, data);
  }

  setActiveAcademicYear(id: number): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin-settings/academic-years/${id}/set-active`, {});
  }

  promoteStudents(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/promote-students`, data);
  }

  // Admin assignment
  getUsers(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/users`);
  }

  getAdmins(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/admin-settings/admins`);
  }

  assignAdmin(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/admin-settings/assign-admin`, data);
  }

  removeAdmin(userId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/admin-settings/admins/${userId}`);
  }
}