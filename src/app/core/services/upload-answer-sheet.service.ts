import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, QuestionPaperDto } from '../models/common.models';
import {
  StudentUploadListResponse,
  SubmitAllPayload,
  SubmitAllResponse,
} from '../models/upload-answer-sheet.models';

@Injectable({ providedIn: 'root' })
export class UploadAnswerSheetService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getStudentsWithUploadStatus(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
    questionPaperId: number,
  ): Observable<ApiResponse<StudentUploadListResponse>> {
    return this.http.get<ApiResponse<StudentUploadListResponse>>(
      `${this.apiUrl}/student-answer-sheet/students-with-upload-status`,
      { params: { classId, sectionId, subjectId, examTypeId, questionPaperId } },
    );
  }

  uploadStudentAnswer(formData: FormData): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/upload`,
      formData,
    );
  }

  updateAnswerSheet(formData: FormData): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/update`,
      formData,
    );
  }

  submitAllStudents(payload: SubmitAllPayload): Observable<ApiResponse<SubmitAllResponse>> {
    return this.http.post<ApiResponse<SubmitAllResponse>>(
      `${this.apiUrl}/student-answer-sheet/submit-all`,
      payload,
    );
  }

 replaceImage(fd: FormData): Observable<any> {
  return this.http.put(`${this.apiUrl}/student-answer-sheet/replace-image`, fd);
}

  deleteAnswerSheet(studentId: number, questionPaperId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/delete`,
      { params: { studentId, questionPaperId } },
    );
  }

  // ── Admin: delete ALL answer sheets for a question paper (all 4 tables + blobs)
  deleteAllAnswerSheets(questionPaperId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/delete-all`,
      { params: { questionPaperId } },
    );
  }

  // ── Admin: delete all answer sheets for a specific class+section (current filter)
  deleteBySectionAndPaper(
    classId: number, sectionId: number, questionPaperId: number,
  ): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/delete-by-section`,
      { params: { classId, sectionId, questionPaperId } },
    );
  }

  /** Downloads a single image blob and returns it as a base64 data URL.
   *  Pass cacheBust (e.g. Date.now()) to bypass browser cache after a replacement. */
  downloadImage(studentId: number, slotIndex: number, questionPaperId: number, cacheBust?: number): Observable<string> {
    const bust = cacheBust ?? Date.now();
    const url = `${this.apiUrl}/student-answer-sheet/download-image/${studentId}`
      + `?slotIndex=${slotIndex}&questionPaperId=${questionPaperId}&t=${bust}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      switchMap(blob => new Observable<string>(observer => {
        const reader = new FileReader();
        reader.onload = () => { observer.next(reader.result as string); observer.complete(); };
        reader.onerror = () => observer.error(reader.error);
        reader.readAsDataURL(blob);
      }))
    );
  }
}