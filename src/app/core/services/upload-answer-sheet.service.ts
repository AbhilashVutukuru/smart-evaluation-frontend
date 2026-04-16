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

  /** Downloads a single image blob and returns it as a base64 data URL */
  downloadImage(studentId: number, slotIndex: number, questionPaperId: number): Observable<string> {
    const url = `${this.apiUrl}/student-answer-sheet/download-image/${studentId}`
      + `?slotIndex=${slotIndex}&questionPaperId=${questionPaperId}`;
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