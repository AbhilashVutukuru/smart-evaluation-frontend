// ============================================
// EXAM RESULT MODELS
// ============================================

/** Rubric evaluation entry with UI editing state */
export interface ResultRubric {
  // Identity
  questionPaperRubricId?: number;
  id?: number;

  // Display
  name?: string;
  criterion?: string;

  // Marks
  maxMarks: number;
  marksGiven: number;
  marksAssignedBySystem?: number;
  marksAssignedByTeacher?: number;

  // Remarks
  systemRemarks?:   string;   // set by AI evaluator — readonly
  teacherRemarks?:  string;   // editable by teacher on override

  // UI-only editing state
  isEditing?: boolean;
  isSaving?: boolean;
  originalMarksGiven?: number;
  originalRemarks?: string;
  teacherModified?: boolean;
}

/** A single question with student and official answers */
export interface ResultQuestion {
  questionPaperDetailId?: number;
  questionNumber: number;
  questionText: string;
  officialAnswer: string;
  maxMarks: number;
  rubrics?: ResultRubric[];
  studentAnswer?: string;
  studentAnswerText?: string;
  marksObtained: number;
  confidenceScore?: number;
  remarks?: string;
  rubricAdded: boolean;
}

/** Exam result summary for a student */
export interface ExamResult {
  studentId?: number;
  studentName?: string;
  totalMarks?: number;
  totalMarksObtained?: number;
  maxMarks?: number;
  marksObtained?: number;
  evaluationStatus?: string;
  isAbsent?: boolean;
  statusMessage?: string;
  answerPdfUrl?: string;
  questions: ResultQuestion[];
}

/** Student summary shown in the results list */
export interface StudentResultInfo {
  studentId: number;
  rollNumber: number;
  studentName: string;
  displayText: string;
  hasUploaded: boolean;
  isAbsent: boolean;
  totalMarks?: number;
  obtainedMarks?: number;
  marksObtained?: number;
  evaluationStatus?: string;
  documentUrl?: string;
  fileName?: string;
  documentName?: string;
  className?: string;
  sectionName?: string;
}

/** Aggregated statistics for evaluated students */
export interface EvaluationStatistics {
  totalStudents: number;
  absentCount: number;
  evaluatedCount: number;
  notEvaluatedCount: number;
}

/** Full response from the student-list-with-statistics API */
export interface StudentListResponse {
  statistics: EvaluationStatistics;
  students: StudentResultInfo[];
  totalMarks: number;
  totalQuestions: number;
  questionNumbers: number[];
  answerSheetsSubmitted: boolean;  
  questionMaxMarks: number[];
}