import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http   = inject(HttpClient); // FIX: inject() pattern instead of constructor
  private apiUrl = environment.apiUrl;

  getStudents(classId?: string, sectionId?: string): Observable<ApiResponse> {
    // FIX: HttpParams instead of manual string concatenation —
    // handles encoding and avoids empty param bugs (e.g. ?classId=&sectionId=)
    let params = new HttpParams();
    if (classId)   params = params.set('classId',   classId);
    if (sectionId) params = params.set('sectionId', sectionId);
    return this.http.get<ApiResponse>(`${this.apiUrl}/student`, { params });
  }

  getStudentById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/student/${id}`);
  }

  updateStudent(data: any): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/student/${data.id}`, data);
  }

  deleteStudent(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/student/${id}`);
  }
}