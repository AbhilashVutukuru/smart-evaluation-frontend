import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============================================================
// DTOs - Shared across application
// ============================================================

export interface AcademicYear {
  id: number;
  yearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ClassDto {
  id: number;
  className: string;
  classNumber?: string;
}

export interface SectionDto {
  id: number;
  sectionName: string;
}

export interface SubjectDto {
  selected: any;
  id: number;
  subjectName: string;
  subjectCode?: string;
}

export interface ExamTypeDto {
  id: number;
  examTypeName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================
// MASTER DATA SERVICE - Reusable across ALL components
// ============================================================

@Injectable({
  providedIn: 'root',
})
export class MasterDataService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/master-data`;

  // ✅ BehaviorSubject for instant updates
  private academicYearSubject = new BehaviorSubject<string | null>(null);
  public academicYear$ = this.academicYearSubject.asObservable();

   getCurrentAcademicYear(): Observable<ApiResponse<AcademicYear>> {
    return this.http.get<ApiResponse<AcademicYear>>(
      `${this.apiUrl}/current-academic-year`
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.academicYearSubject.next(response.data.yearName);
        }
      })
    );
  }

  // ✅ CRITICAL: Instantly update academic year (no API call)
  updateAcademicYearInstantly(yearName: string): void {
    this.academicYearSubject.next(yearName);
  }

  // ============================================================
  // ✅ GET CLASSES (used everywhere)
  // ============================================================
  getClasses(): Observable<ClassDto[]> {
    return this.http
      .get<ApiResponse<ClassDto[]>>(`${this.apiUrl}/classes`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching classes:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ GET SECTIONS BY CLASS (cascading dropdown)
  // ============================================================
  getSectionsByClass(classId: number | string): Observable<SectionDto[]> {
    return this.http
      .get<
        ApiResponse<SectionDto[]>
      >(`${this.apiUrl}/sections/by-class/${classId}`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching sections:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ GET SUBJECTS BY CLASS (cascading dropdown)
  // ============================================================
  getSubjectsByClass(classId: number | string): Observable<SubjectDto[]> {
    return this.http
      .get<
        ApiResponse<SubjectDto[]>
      >(`${this.apiUrl}/subjects/by-class/${classId}`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching subjects:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ GET EXAM TYPES BY CLASS (cascading dropdown)
  // ============================================================
  getExamTypesByClass(classId: number | string): Observable<ExamTypeDto[]> {
    return this.http
      .get<
        ApiResponse<ExamTypeDto[]>
      >(`${this.apiUrl}/exam-types/by-class/${classId}`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching exam types:', error);
          return throwError(() => error);
        }),
      );
  } 

  // ============================================================
  // ✅ GET ALL MASTER SECTIONS (not filtered by class)
  // Used in admin settings to manage master section list
  // ============================================================
  getAllSections(): Observable<SectionDto[]> {
    return this.http
      .get<ApiResponse<SectionDto[]>>(`${this.apiUrl}/sections`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching all sections:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ GET ALL MASTER SUBJECTS (not filtered by class)
  // Used in admin settings to manage master subject list
  // ============================================================
  getAllSubjects(): Observable<SubjectDto[]> {
    return this.http
      .get<ApiResponse<SubjectDto[]>>(`${this.apiUrl}/subjects`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching all subjects:', error);
          return throwError(() => error);
        }),
      );
  }

  // ============================================================
  // ✅ GET ALL MASTER EXAM TYPES (not filtered by class)
  // Used in admin settings to manage master exam type list
  // ============================================================
  getAllExamTypes(): Observable<ExamTypeDto[]> {
    return this.http
      .get<ApiResponse<ExamTypeDto[]>>(`${this.apiUrl}/exam-types`)
      .pipe(
        map((response) => response.data || []),
        catchError((error) => {
          console.error('Error fetching all exam types:', error);
          return throwError(() => error);
        }),
      );
  }
}
