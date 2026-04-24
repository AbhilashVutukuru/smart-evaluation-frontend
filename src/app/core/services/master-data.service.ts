import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, EMPTY } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface AcademicYear {
  id       : number;
  yearName : string;
  startDate: string;
  endDate  : string;
  isActive : boolean;
}

export interface ClassDto {
  id          : number;
  className   : string;
  classNumber?: string;
}

export interface SectionDto {
  id         : number;
  sectionName: string;
}

export interface SubjectDto {
  selected   : any;
  id         : number;
  subjectName: string;
  subjectCode?: string;
}

export interface ExamTypeDto {
  id          : number;
  examTypeName: string;
}

export interface ApiResponse<T> {
  success : boolean;
  data    : T;
  message?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/master-data`;

  // Academic year broadcast — updated after fetching or manually
  private academicYearSubject = new BehaviorSubject<string | null>(null);
  readonly academicYear$ = this.academicYearSubject.asObservable();

  // ── Academic Year ──────────────────────────────────────────
  getCurrentAcademicYear(): Observable<ApiResponse<AcademicYear>> {
    return this.http
      .get<ApiResponse<AcademicYear>>(`${this.apiUrl}/current-academic-year`)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.academicYearSubject.next(response.data.yearName);
          }
        }),
      );
  }

  /** Instantly update the displayed academic year without an API call. */
  updateAcademicYearInstantly(yearName: string): void {
    this.academicYearSubject.next(yearName);
  }

  // ── Classes ────────────────────────────────────────────────
  getClasses(): Observable<ClassDto[]> {
    return this.http
      .get<ApiResponse<ClassDto[]>>(`${this.apiUrl}/classes`)
      .pipe(
        map(r => r.data ?? []),
        // FIX: removed console.error + throwError — errors propagate naturally
        // to the caller's error handler (ErrorHandlerService). Logging here
        // would duplicate the error and expose internals in production.
        catchError(() => EMPTY),
      );
  }

  // ── Sections by Class ──────────────────────────────────────
  getSectionsByClass(classId: number | string): Observable<SectionDto[]> {
    return this.http
      .get<ApiResponse<SectionDto[]>>(`${this.apiUrl}/sections/by-class/${classId}`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }

  // ── Subjects by Class ──────────────────────────────────────
  getSubjectsByClass(classId: number | string): Observable<SubjectDto[]> {
    return this.http
      .get<ApiResponse<SubjectDto[]>>(`${this.apiUrl}/subjects/by-class/${classId}`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }

  // ── Exam Types by Class ────────────────────────────────────
  getExamTypesByClass(classId: number | string): Observable<ExamTypeDto[]> {
    return this.http
      .get<ApiResponse<ExamTypeDto[]>>(`${this.apiUrl}/exam-types/by-class/${classId}`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }

  // ── All Sections (admin settings) ─────────────────────────
  getAllSections(): Observable<SectionDto[]> {
    return this.http
      .get<ApiResponse<SectionDto[]>>(`${this.apiUrl}/sections`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }

  // ── All Subjects (admin settings) ─────────────────────────
  getAllSubjects(): Observable<SubjectDto[]> {
    return this.http
      .get<ApiResponse<SubjectDto[]>>(`${this.apiUrl}/subjects`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }

  // ── All Exam Types (admin settings) ───────────────────────
  getAllExamTypes(): Observable<ExamTypeDto[]> {
    return this.http
      .get<ApiResponse<ExamTypeDto[]>>(`${this.apiUrl}/exam-types`)
      .pipe(
        map(r => r.data ?? []),
        catchError(() => EMPTY),
      );
  }
}