// ============================================
// EXAM RESULT INTERFACES
// ============================================

export interface StudentInfo {
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

export interface Rubric {
  // Primary ID
  questionPaperRubricId?: number;
  id?: number;
  
  // Name/Criterion
  name?: string;
  criterion?: string;
  
  // Marks
  maxMarks: number;
  marksGiven: number;
  marksAssignedBySystem?: number;
  marksAssignedByTeacher?: number;
  
  // Remarks
  remarks?: string;
  
  // Editing state (UI only)
  isEditing?: boolean;
  isSaving?: boolean; 
  originalMarksGiven?: number;
  originalRemarks?: string;
  teacherModified?: boolean;
}

export interface ExamQuestion {
  questionPaperDetailId?: number;
  questionNumber: number;
  questionText: string;
  officialAnswer: string;
  maxMarks: number;
  rubrics?: Rubric[];
  studentAnswer?: string;
  studentAnswerText?: string;
  marksObtained: number;
  confidenceScore?: number;
  remarks?: string;
}

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
  questions: ExamQuestion[];
}

export interface StudentStatistics {
  totalStudents: number;
  absentCount: number;
  evaluatedCount: number;
  notEvaluatedCount: number;
}

export interface StudentListResponse {
  statistics: StudentStatistics;
  students: StudentInfo[];
  totalMarks: number;
  totalQuestions: number;
  questionNumbers: number[];
}