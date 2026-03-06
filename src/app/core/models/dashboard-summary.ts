// ── Admin ─────────────────────────────────────────────────────────────────────

export interface ClassEvaluationBreakdown {
  className:         string;
  sectionName:       string;
  subjectName:       string;
  examTypeName:      string;
  questionPaperName: string;
  totalMarks:        number;
  totalStudents:     number;
  uploaded:          number;
  evaluated:         number;
  pending:           number;
  absent:            number;
}

export interface RecentActivity {
  studentName: string;
  className:   string;
  sectionName: string;
  subject:     string;
  examType:    string;
  status:      string;
  uploadedAt:  string;
}

export interface AdminSummary {
  totalStudents:        number;
  totalTeachers:        number;
  totalClasses:         number;
  totalQuestionPapers:  number;
  pendingEvaluations:   number;
  completedEvaluations: number;
  classBreakdown:       ClassEvaluationBreakdown[];
  recentActivity:       RecentActivity[];
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export interface SubjectResultSummary {
  subjectName:   string;
  examTypeName:  string;
  totalStudents: number;
  evaluated:     number;
  pending:       number;
}

export interface TeacherSummary {
  assignedSubjects:      number;
  questionPapersCreated: number;
  pendingEvaluations:    number;
  completedEvaluations:  number;
  subjectSummaries:      SubjectResultSummary[];
}

// ── Student ───────────────────────────────────────────────────────────────────

export interface StudentResultRow {
  subjectName:  string;
  examTypeName: string;
  obtainedMarks: number;
  totalMarks:    number;
  status:        string;
  percentage:    number;
}

export interface StudentSummary {
  totalExams:     number;
  evaluatedExams: number;
  pendingExams:   number;
  averageScore:   number;
  results:        StudentResultRow[];
}

// ── Root ──────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  role:         string;
  userName:     string;
  academicYear: string;
  admin?:       AdminSummary;
  teacher?:     TeacherSummary;
  student?:     StudentSummary;
}