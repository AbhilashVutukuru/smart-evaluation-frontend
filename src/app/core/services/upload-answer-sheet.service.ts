import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { QuestionPaperDto } from '../models/exam';

@Injectable({
  providedIn: 'root',
})
export class UploadAnswerSheetService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getQuestionPapers(
  classId: number,
  subjectId: number,
  examTypeId: number
) {
  return this.http.get<ApiResponse<QuestionPaperDto[]>>(
    `${this.apiUrl}/student-answer-sheet/question-papers`,
    {
      params: {
        classId: classId,
        subjectId: subjectId,
        examTypeId: examTypeId
      }
    }
  );
}

  getStudentsWithUploadStatus(
    classId: number,
    sectionId: number,
    subjectId: number,
    examTypeId: number,
    questionPaperId:number,
  ): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.apiUrl}/student-answer-sheet/students-with-statistics?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&examTypeId=${examTypeId}&questionPaperId=${questionPaperId}`,
    );
  }

  uploadStudentAnswer(formData: FormData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/student-answer-sheet/upload`,
      formData,
    );
  }
  
  updateAnswerSheet(formData: FormData): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/student-answer-sheet/update`,
    formData
  );
}

  submitAllStudents(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/student-answer-sheet/submit-all`,
      data,
    );
  }

  // downloadAnswerSheet(
  //   studentId: number,
  //   classId: number,
  //   subjectId: number,
  //   examTypeId: number,
  // ): Observable<HttpResponse<Blob>> {
  //   const url = `${this.apiUrl}/student-answer-sheet/download/${studentId}?classId=${classId}&subjectId=${subjectId}&examTypeId=${examTypeId}`;
  //   return this.http.get(url, { responseType: 'blob', observe: 'response' });
  // }


}
