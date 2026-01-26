import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentRegisterRequest,
  TeacherRegisterRequest,
  BulkUploadResponse,
  ClassDropdown,
  SectionDropdown,
  SubjectDropdown,
  ApiResponse,
  NextRollNumber,
} from '../models/registration.model';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Student Registration
  registerStudent(data: StudentRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/registration/student`,
      data,
    );
  }

  bulkUploadStudents(
    file: File,
    classId: number,
    sectionId: number,
  ): Observable<BulkUploadResponse> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    formData.append('ClassId', classId.toString());
    formData.append('SectionId', sectionId.toString());
    return this.http.post<BulkUploadResponse>(
      `${this.apiUrl}/bulk-registration/upload-students`,
      formData,
    );
  }

  // Teacher Registration
  registerTeacher(data: TeacherRegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/registration/teacher`,
      data,
    );
  }

  bulkUploadTeachers(file: File): Observable<BulkUploadResponse> {
    const formData = new FormData();
    formData.append('ExcelFile', file);
    return this.http.post<BulkUploadResponse>(
      `${this.apiUrl}/bulk-registration/upload-teachers`,
      formData,
    );
  }

  // Dropdowns
  getClasses(): Observable<ApiResponse<ClassDropdown[]>> {
    return this.http.get<ApiResponse<ClassDropdown[]>>(
      `${this.apiUrl}/master-data/classes`,
    );
  }

  getSections(classId: number): Observable<ApiResponse<SectionDropdown[]>> {
    return this.http.get<ApiResponse<SectionDropdown[]>>(
      `${this.apiUrl}/master-data/sections?classId=${classId}`,
    );
  }

  getSubjects(): Observable<ApiResponse<SubjectDropdown[]>> {
    return this.http.get<ApiResponse<SubjectDropdown[]>>(
      `${this.apiUrl}/master-data/subjects`,
    );
  }

  getNextRollNumber(
    classId: number,
    sectionId: number,
  ): Observable<ApiResponse<NextRollNumber>> {
    return this.http.get<ApiResponse<NextRollNumber>>(
      `${this.apiUrl}/student/next-roll-number?classId=${classId}&sectionId=${sectionId}`,
    );
  }
     
  var =10;
}
