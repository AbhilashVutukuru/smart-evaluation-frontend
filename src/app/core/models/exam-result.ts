export interface StudentInfo {
  studentId: number;
  rollNumber: number;
  studentName: string;
  displayText: string;
  hasUploaded: boolean;
  isAbsent: boolean;
}

export interface RubricMarks {
  questionPaperRubricId?: number;
  criterion?: string;
  name?: string;
  marksGiven: number;
  maxMarks: number;
  marksAssignedBySystem?: number;
  marksAssignedByTeacher?: number;
  remarks?: string;
}

export interface Rubric {
  // Primary ID properties (add these if missing)
  questionPaperRubricId?: number;
  id?: number;  // ✅ ADD THIS - Sometimes API returns 'id' instead
  QuestionPaperRubricId?: number;  // ✅ ADD THIS - PascalCase from API
  
  // Name/Criterion properties
  name?: string;
  criterion?: string;
  Criterion?: string;  // ✅ ADD THIS - PascalCase from API
  
  // Marks properties
  maxMarks: number;
  MaxMarks?: number;  // ✅ ADD THIS - PascalCase from API
  
  marksGiven: number;
  MarksGiven?: number;  // ✅ ADD THIS - PascalCase from API
  
  marksAssignedBySystem?: number;
  MarksAssignedBySystem?: number;  // ✅ ADD THIS
  
  marksAssignedByTeacher?: number;
  MarksAssignedByTeacher?: number;  // ✅ ADD THIS
  
  remarks?: string;
  Remarks?: string;  // ✅ ADD THIS
}

export interface ExamQuestion {
  questionPaperDetailId?: number;
  questionNumber: number;
  questionText: string;
  officialAnswer: string;
  maxMarks: number;
  rubrics?: Rubric[];  // From API
  rubricMarks?: RubricMarks[];  // Legacy, for backward compatibility
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
  evaluationStatus?: string;
  isAbsent?: boolean;
  statusMessage?: string;
  answerPdfUrl?: string;
  questions: ExamQuestion[];
}
