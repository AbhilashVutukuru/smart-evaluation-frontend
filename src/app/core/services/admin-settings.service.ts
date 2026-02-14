import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin-settings`;

  // ── Classes ──────────────────────────────────────────────
  getClasses = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/classes`);

  createClass = (body: any): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/classes`, body);

  deleteClass = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/classes/${id}`);

  // ── Master Sections (name only, not linked to class) ─────
  getMasterSections = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/master-sections`);

  createMasterSection = (body: any): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/master-sections`, body);

  deleteMasterSection = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/master-sections/${id}`);

  // ── Master Subjects (name only) ───────────────────────────
  getMasterSubjects = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/master-subjects`);

  createMasterSubject = (body: any): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/master-subjects`, body);

  deleteMasterSubject = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/master-subjects/${id}`);

  // ── Master Exam Types (name only) ─────────────────────────
  getMasterExamTypes = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/master-exam-types`);

  createMasterExamType = (body: any): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/master-exam-types`, body);

  deleteMasterExamType = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/master-exam-types/${id}`);

  // ── Assigned Sections (class ↔ section) ──────────────────
  getAssignedSections = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/assigned-sections`);

  assignSection = (body: { classId: number; masterSectionId: number }): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/assigned-sections`, body);

  removeAssignedSection = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/assigned-sections/${id}`);

  // ── Assigned Subjects (class ↔ section ↔ subject) ────────
  getAssignedSubjects = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/assigned-subjects`);

  assignSubject = (body: { classId: number; sectionId: number; subjectId: number }): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/assigned-subjects`, body);

  removeAssignedSubject = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/assigned-subjects/${id}`);

  // ── Assigned Exam Types (class ↔ section ↔ exam type) ────
  getAssignedExamTypes = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/assigned-exam-types`);

  assignExamType = (body: { classId: number; sectionId: number; examTypeId: number }): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/assigned-exam-types`, body);

  removeAssignedExamType = (id: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/assigned-exam-types/${id}`);

  // ── Sections filtered by class (for assignment dropdowns) ─
  getSectionsByClass = (classId: number): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/assigned-sections/by-class/${classId}`);

  // ── Academic Years ────────────────────────────────────────
  getAcademicYears = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/academic-years`);

  createAcademicYear = (body: any): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/academic-years`, body);

  setActiveAcademicYear = (id: number): Observable<ApiResponse> =>
    this.http.put<ApiResponse>(`${this.base}/academic-years/${id}/set-active`, {});

  promoteStudents = (body: { fromYearId: number; toYearId: number }): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/promote-students`, body);

  // ── Users & Admins ────────────────────────────────────────
  getUsers = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/users`);

  getAdmins = (): Observable<ApiResponse<any[]>> =>
    this.http.get<ApiResponse<any[]>>(`${this.base}/admins`);

  assignAdmin = (body: { userId: number }): Observable<ApiResponse> =>
    this.http.post<ApiResponse>(`${this.base}/assign-admin`, body);

  removeAdmin = (userId: number): Observable<ApiResponse> =>
    this.http.delete<ApiResponse>(`${this.base}/admins/${userId}`);
}