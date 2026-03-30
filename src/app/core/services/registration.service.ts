import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentRegisterRequest,
  TeacherRegisterRequest,
  BulkUploadResponse,
  ApiResponse,
  NextRollNumber,
} from '../models/registration.model';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ Download template method
  downloadTemplate(type: 'student' | 'teacher'): Observable<Blob> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    });

    const urlType = type === 'student' ? 'student' : 'teacher';

    return this.http.get(
      `${this.apiUrl}/bulk-registration/${urlType}-template`,
      {
        headers: headers,
        responseType: 'blob',
      }
    );
  }

  // Student Registration
  registerStudent(data: StudentRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/registration/student`,
      data
    );
  }

  bulkUploadStudents(
    file: File,
    classId: number,
    sectionId: number
  ): Observable<any> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    formData.append('ClassId', classId.toString());
    formData.append('SectionId', sectionId.toString());
    return this.http.post<any>(
      `${this.apiUrl}/bulk-registration/upload-students`,
      formData
    );
  }

  // Teacher Registration
  registerTeacher(data: TeacherRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/registration/teacher`,
      data
    );
  }

  bulkUploadTeachers(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    return this.http.post<any>(
      `${this.apiUrl}/bulk-registration/upload-teachers`,
      formData
    );
  }

  // Get Next Roll Number
  getNextRollNumber(
    classId: number,
    sectionId: number
  ): Observable<ApiResponse<NextRollNumber>> {
    return this.http.get<ApiResponse<NextRollNumber>>(
      `${this.apiUrl}/student/next-roll-number?classId=${classId}&sectionId=${sectionId}`
    );
  }
}