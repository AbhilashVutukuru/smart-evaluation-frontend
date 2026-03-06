// ============================================
// UPLOAD ANSWER SHEET MODELS
// ============================================

/** Per-student upload status tracked in the upload UI */
export interface StudentUploadStatus {
  studentId: number;
  rollNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  isAbsent: boolean;
  isUploaded: boolean;
  isUploading?: boolean;
  answerSheetFile?: File;
  fileName?: string;
}

/** Aggregated statistics for the upload screen */
export interface UploadStatistics {
  totalStudents: number;
  absentCount: number;
  uploadedCount: number;
  pendingCount: number;
}

/** Response shape from the students-with-statistics API */
export interface StudentUploadListResponse {
  students: StudentUploadStatus[];
  isEvaluationSubmitted?: boolean;
}

/** Payload sent to submit-all endpoint */
export interface SubmitAllPayload {
  classId: number;
  sectionId: number;
  subjectId: number;
  examTypeId: number;
   questionPaperId: number;
  absentStudentIds: number[];
}