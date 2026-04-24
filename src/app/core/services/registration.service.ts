import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentRegisterRequest,
  TeacherRegisterRequest,
  ApiResponse,
  NextRollNumber,
} from '../models/registration.model';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private http   = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── Template Downloads ─────────────────────────────────────
  downloadTemplate(type: 'student' | 'teacher'): Observable<Blob> {
    // FIX: removed manual Authorization header — your app uses HttpOnly cookies.
    // The auth interceptor adds withCredentials automatically.
    // Manually reading localStorage('token') would always be empty since
    // the token is in an HttpOnly cookie, not localStorage.
    return this.http.get(
      `${this.apiUrl}/bulk-registration/${type}-template`,
      { responseType: 'blob' },
    );
  }

  // ── Student Registration ───────────────────────────────────
  registerStudent(data: StudentRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/registration/student`, data);
  }

  bulkUploadStudents(file: File, classId: number, sectionId: number): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    formData.append('ClassId',   classId.toString());
    formData.append('SectionId', sectionId.toString());
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-registration/upload-students`, formData);
  }

  // ── Teacher Registration ───────────────────────────────────
  registerTeacher(data: TeacherRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/registration/teacher`, data);
  }

  bulkUploadTeachers(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-registration/upload-teachers`, formData);
  }

  // ── Roll Number ────────────────────────────────────────────
  getNextRollNumber(classId: number, sectionId: number): Observable<ApiResponse<NextRollNumber>> {
    // FIX: use HttpParams instead of manually building query string —
    // HttpParams handles encoding automatically (spaces, special chars etc.)
    const params = new HttpParams()
      .set('classId',   classId)
      .set('sectionId', sectionId);
    return this.http.get<ApiResponse<NextRollNumber>>(
      `${this.apiUrl}/student/next-roll-number`, { params });
  }
}