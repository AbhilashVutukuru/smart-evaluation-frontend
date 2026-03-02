import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, QuestionPaperDto } from '../models/common.models';
import {
  StudentUploadListResponse,
  SubmitAllPayload,
} from '../models/upload-answer-sheet.models';

@Injectable({ providedIn: 'root' })
export class UploadAnswerSheetService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getQuestionPapers(
    classId: number,
    subjectId: number,
    examTypeId: number,
  ): Observable<ApiResponse<QuestionPaperDto[]>> {
    return this.http.get<ApiResponse<QuestionPaperDto[]>>(
      `${this.apiUrl}/student-answer-sheet/question-papers`,
      { params: { classId, subjectId, examTypeId } },
    );
  }

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

  submitAllStudents(payload: SubmitAllPayload): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiUrl}/student-answer-sheet/submit-all`,
      payload,
    );
  }
}