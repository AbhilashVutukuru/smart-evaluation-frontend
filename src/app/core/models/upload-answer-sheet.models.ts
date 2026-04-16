// ============================================
// UPLOAD ANSWER SHEET MODELS
// ============================================

/** Per-student upload status tracked in the upload UI */
export interface StudentUploadStatus {
  studentId:        number;
  rollNumber:       string;
  studentName:      string;
  className:        string;
  sectionName:      string;
  isAbsent:         boolean;
  isUploaded:       boolean;
  isUploading?:     boolean;
  fileName?:        string;
  answerSheetFile?: File;

  // ─── New fields ───────────────────────────────────────────────────────────
  /** Whether the upload was a PDF or a set of images converted to PDF */
  answerSheetType?:  'PDF' | 'Images' | null;

  /** For Images type: original image filenames e.g. ['IMG_001.jpg', 'IMG_002.jpg'] */
  imageFileNames?:   string[];

  /** Original File objects for Images type — sent to backend for blob storage */
  imageFiles?:       File[];

  /** Pipe-separated blob paths for Images type — used for deletion on replace */
  imageBlobPaths?:   string;

  /** Evaluation status returned from the server: 'Evaluated' | 'Pending' */
  evaluationStatus?: string;
}

/** One image slot in the preview/edit modal */
export interface ImagePreviewSlot {
  index:            number;
  fileName:         string;
  blobPath:         string;
  previewUrl:       string | null;
  newFile:          File | null;
  newPreviewUrl:    string | null;
  isLoadingPreview: boolean;
  isReplaced:       boolean;  // true = existing image replaced with a different one
  isNew:            boolean;  // true = brand new image added (not replacing existing)
}

/** Modal state for image preview & per-slot replace */
export interface ImagePreviewModal {
  studentId:  number;
  studentName: string;
  slots:      ImagePreviewSlot[];
  isSaving:   boolean;
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
  students:              StudentUploadStatus[];
  isEvaluationSubmitted?: boolean;
  /** UTC timestamp when the batch was submitted for evaluation.
   *  Sourced from EvaluationQueue.CreatedDate. Null if not yet submitted. */
  submittedAt?:          string | null;
}

/** Payload sent to submit-all endpoint */
export interface SubmitAllPayload {
   classId:          number;
  sectionId:        number;
  subjectId:        number;
  examTypeId:       number;
  questionPaperId:  number;
  absentStudentIds: number[];
}

/** Response from submit-all endpoint */
export interface SubmitAllResponse {
  totalStudents: number;
  uploadedCount: number;
  absentCount:   number;
  pendingCount:  number;
  message?:      string;
  /** UTC ISO 8601 string e.g. "2026-04-15T09:37:56Z" */
  submittedAt?:  string | null;
}