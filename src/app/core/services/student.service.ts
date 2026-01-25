import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStudents(classId?: string, sectionId?: string): Observable<ApiResponse> {
    let url = `${this.apiUrl}/student`;
    const params = [];
    if (classId) params.push(`classId=${classId}`);
    if (sectionId) params.push(`sectionId=${sectionId}`);
    if (params.length) url += `?${params.join('&')}`;
    
    return this.http.get<ApiResponse>(url);
  }

  getStudentById(id: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/student/${id}`);
  }

  deleteStudent(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/student/${id}`);
  }
}