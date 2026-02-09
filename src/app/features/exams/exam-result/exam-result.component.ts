import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamResultService } from '../../../core/services/exam-result.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CreateExamService } from '../../../core/services/create-exam.service';
import {
  StudentInfo,
  ExamResult,
  ExamQuestion,
} from '../../../core/models/exam-result';
import {
  Class,
  SubjectItem,
  ExamType,
  Section,
} from '../../../shared/models/common';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-result.component.html',
  styleUrls: ['./exam-result.component.css'],
})
export class ExamResultsComponent implements OnInit {
  private resultsService = inject(ExamResultService);
  private toastService = inject(ToastService);
  private teacherUploadService = inject(CreateExamService);

  selectedClass: string = '';
  selectedSection: string = '';
  selectedSubject: string = '';
  selectedExamType: string = '';

  students: StudentInfo[] = [];
  selectedStudent: StudentInfo | null = null;
  currentResults: ExamResult | null = null;

  isLoading = false;
  showStudentCard = false;
  showResultsCard = false;

  // ✅ NEW: Track search completion and errors
  searchCompleted = false;
  error = '';

  classes: Class[] = [];
  sections: Section[] = [];
  subjects: SubjectItem[] = [];
  examTypes: ExamType[] = [];

  userName = 'Test Teacher';
  userEmail = 'teacher@school.edu';
  userAvatar = 'TT';

  // Pagination properties
  currentQuestionIndex = 0;
  totalQuestions = 0;
  currentQuestion: ExamQuestion | null = null;
  isLoadingQuestion = false;

  ngOnInit(): void {
    this.loadInitialData();
    this.getUserInfo();
  }

  private loadInitialData(): void {
    this.teacherUploadService.getClasses().subscribe((classes) => {
      this.classes = classes;
    });
    this.teacherUploadService.getSections(1).subscribe((sections) => {
      this.sections = sections;
    });
    this.teacherUploadService.getSubjects().subscribe((subjects) => {
      this.subjects = subjects;
    });
    this.teacherUploadService.getExamTypes().subscribe((examTypes) => {
      this.examTypes = examTypes;
    });
  }

  private getUserInfo(): void {
    const userInfo = this.teacherUploadService.getUserInfo();
    this.userName = `${userInfo.firstName} ${userInfo.lastName}`;
    this.userEmail = userInfo.email;
    this.userAvatar =
      `${userInfo.firstName.charAt(0)}${userInfo.lastName.charAt(0)}`.toUpperCase();
  }

  // ✅ MODIFIED: Clear student data when class changes
  onClassSelected(classId: string): void {
    this.selectedSection = '';
    this.sections = [];
    
    // ✅ Clear student data when filters change
    this.clearStudentData();
    
    if (classId) {
      this.teacherUploadService
        .getSections(parseInt(classId))
        .subscribe((sections) => {
          this.sections = sections;
        });
    }
  }

  // ✅ NEW: Clear all student-related data
  clearStudentData(): void {
    this.students = [];
    this.selectedStudent = null;
    this.currentResults = null;
    this.showStudentCard = false;
    this.showResultsCard = false;
    this.searchCompleted = false;
    this.error = '';
    this.currentQuestion = null;
    this.currentQuestionIndex = 0;
    this.totalQuestions = 0;
  }

  // ✅ MODIFIED: getStudents - Clear previous data first
  getStudents(): void {
    const missingFields: string[] = [];

    if (!this.selectedClass) missingFields.push('Class');
    if (!this.selectedSection) missingFields.push('Section');
    if (!this.selectedSubject) missingFields.push('Subject');
    if (!this.selectedExamType) missingFields.push('Exam Type');

    if (missingFields.length > 0) {
      this.toastService.showWarning(
        'Validation Error',
        `Please select all required fields: ${missingFields.join(', ')}`,
      );
      return;
    }

    // ✅ CLEAR PREVIOUS DATA BEFORE NEW SEARCH
    this.clearStudentData();

    this.isLoading = true;
    this.error = '';

    this.resultsService
      .getStudents(
        parseInt(this.selectedClass),
        parseInt(this.selectedSection),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
      )
      .subscribe({
        next: (data: StudentInfo[]) => {
          this.students = data;
          this.showStudentCard = data.length > 0;
          this.isLoading = false;
          this.searchCompleted = true; // ✅ Mark search as completed

          if (data.length === 0) {
            this.toastService.showInfo(
              'No Students',
              'No students found for the selected exam details',
            );
          } else {
            this.toastService.showSuccess(
              'Success',
              `Found ${data.length} student(s)`,
            );
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.searchCompleted = true; // ✅ Mark search as completed even on error
          this.error = err.error?.message || 'Error loading students';
          this.toastService.showError('Error', this.error);
        },
      });
  }

  onStudentChange(): void {
    if (!this.selectedStudent) {
      this.showResultsCard = false;
      this.currentResults = null;
      return;
    }
    this.loadStudentResults();
  }

  loadStudentResults(): void {
    if (!this.selectedStudent) {
      this.showResultsCard = false;
      return;
    }

    this.isLoading = true;
    this.resultsService
      .getExamResults(
        this.selectedStudent.studentId,
        parseInt(this.selectedClass),
        parseInt(this.selectedSection),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
      )
      .subscribe({
        next: (results: ExamResult) => {
          this.currentResults = results;
          this.showResultsCard = true;

          // Initialize pagination if not absent and has questions
          if (!results.isAbsent && results.evaluationStatus === 'Evaluated') {
            this.totalQuestions = results.questions?.length || 0;
            this.currentQuestionIndex = 0;
            if (this.totalQuestions > 0) {
              this.loadQuestion(0);
            }
          }

          this.isLoading = false;
          this.toastService.showSuccess(
            'Success',
            'Results loaded successfully',
          );
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.showWarning(
            'Warning',
            err.error?.message || 'No results found for this student',
          );
        },
      });
  }

  // Pagination Methods
  loadQuestion(index: number): void {
    if (!this.currentResults || !this.selectedStudent) return;

    this.isLoadingQuestion = true;

    // Call API to get specific question data
    this.resultsService
      .getQuestionDetails(
        this.selectedStudent.studentId,
        parseInt(this.selectedClass),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
        index + 1, // Question number (1-based)
      )
      .subscribe({
        next: (question: ExamQuestion) => {
          this.currentQuestion = question;
          this.currentQuestionIndex = index;
          this.isLoadingQuestion = false;
        },
        error: () => {
          this.isLoadingQuestion = false;
          this.toastService.showError('Error', 'Failed to load question');
        },
      });
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.loadQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.loadQuestion(this.currentQuestionIndex - 1);
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.totalQuestions) {
      this.loadQuestion(index);
    }
  }

  getTotalMarks(): number {
    if (!this.currentResults) return 0;
    return this.currentResults.questions.reduce(
      (sum, q) => sum + q.marksObtained,
      0,
    );
  }

  getMaxMarks(): number {
    if (!this.currentResults || this.currentResults.maxMarks === undefined)
      return 0;
    return this.currentResults.maxMarks;
  }

  getPercentage(): number {
    if (
      !this.currentResults ||
      this.currentResults.maxMarks === undefined ||
      this.currentResults.maxMarks === 0
    )
      return 0;
    const total = this.getTotalMarks();
    return (total / this.currentResults.maxMarks) * 100;
  }

  // ✅✅✅ NEW: MASTER VALIDATION METHOD ✅✅✅
  hasValidationError(question: ExamQuestion | null): boolean {
    if (!question || !question.rubrics || question.rubrics.length === 0) {
      return false;
    }

    // Check if any individual rubric exceeds its max
    const hasIndividualRubricError = question.rubrics.some(
      rubric => rubric.marksGiven > rubric.maxMarks
    );

    // Check if total marks exceed question max
    const totalRubricMarks = this.getTotalRubricMarks(question);
    const hasTotalMarksError = totalRubricMarks > question.maxMarks;

    return hasIndividualRubricError || hasTotalMarksError;
  }

  // ✅✅✅ NEW: CALLED WHENEVER RUBRIC MARKS CHANGE ✅✅✅
  onRubricMarksChange(rubric: any, question: ExamQuestion): void {
    // Ensure marks are not negative
    if (rubric.marksGiven < 0) {
      rubric.marksGiven = 0;
    }

    // Check if marks exceed max for this individual rubric
    if (rubric.marksGiven > rubric.maxMarks) {
      // Show toast warning for individual rubric
      this.toastService.showWarning(
        'Invalid Marks',
        `${rubric.criterion || rubric.name}: Marks cannot exceed ${rubric.maxMarks}`
      );
    }

    // Recalculate total marks
    question.marksObtained = this.getTotalRubricMarks(question);

    // Check if total exceeds question max
    const totalMarks = this.getTotalRubricMarks(question);
    if (totalMarks > question.maxMarks) {
      // Show persistent error (will be shown in UI via hasValidationError)
      this.toastService.showError(
        'Total Marks Exceed Maximum',
        `Total marks (${totalMarks}) exceed question maximum (${question.maxMarks})`
      );
    }
  }

  getTotalRubricMarks(question: ExamQuestion): number {
    if (!question.rubrics || question.rubrics.length === 0) return 0;
    return question.rubrics.reduce(
      (sum, rubric) => sum + (rubric.marksGiven || 0),
      0,
    );
  }

  // ✅✅✅ MODIFIED: VALIDATE BEFORE SAVING ✅✅✅
  updateCurrentQuestionMarks(): void {
    if (!this.selectedStudent || !this.currentQuestion) {
      this.toastService.showWarning('Warning', 'No question selected');
      return;
    }

    // ✅ CHECK FOR VALIDATION ERRORS BEFORE SAVING
    if (this.hasValidationError(this.currentQuestion)) {
      const totalMarks = this.getTotalRubricMarks(this.currentQuestion);
      this.toastService.showError(
        'Cannot Save',
        `Total marks (${totalMarks}) exceed maximum (${this.currentQuestion.maxMarks}). Please adjust rubric marks.`
      );
      return;
    }

    // Check if rubrics exist
    if (
      !this.currentQuestion.rubrics ||
      this.currentQuestion.rubrics.length === 0
    ) {
      this.toastService.showWarning(
        'Warning',
        'No rubrics found for this question',
      );
      return;
    }

    // Map rubrics to API format - handle ALL possible property names
    const rubricMarks = this.currentQuestion.rubrics.map((rubric) => {
      // Extract rubric ID - try all possible property names
      const rubricId =
        rubric.questionPaperRubricId ||
        rubric.id ||
        (rubric as any).QuestionPaperRubricId ||
        0;

      // Extract marks given - try all possible property names
      const marksGiven =
        rubric.marksGiven ||
        rubric.marksAssignedByTeacher ||
        (rubric as any).MarksGiven ||
        (rubric as any).MarksAssignedByTeacher ||
        0;

      console.log('Processing rubric:', {
        original: rubric,
        extractedId: rubricId,
        extractedMarks: marksGiven,
      });

      return {
        questionPaperRubricId: rubricId,
        marksGiven: marksGiven,
      };
    });

    // Validate rubric IDs
    const invalidRubrics = rubricMarks.filter(
      (r) => r.questionPaperRubricId === 0,
    );
    if (invalidRubrics.length > 0) {
      console.error('Invalid rubric data found:');
      console.error(
        'Original rubrics:',
        JSON.stringify(this.currentQuestion.rubrics, null, 2),
      );
      console.error('Processed rubrics:', JSON.stringify(rubricMarks, null, 2));
      console.error(
        'Invalid entries:',
        JSON.stringify(invalidRubrics, null, 2),
      );
      this.toastService.showError('Error', 'Invalid rubric data - missing IDs');
      return;
    }

    console.log('=== Saving Rubric Marks ===');
    console.log('Student ID:', this.selectedStudent.studentId);
    console.log('Class ID:', this.selectedClass);
    console.log('Subject ID:', this.selectedSubject);
    console.log('Exam Type ID:', this.selectedExamType);
    console.log('Question Number:', this.currentQuestion.questionNumber);
    console.log('Rubric Marks:', rubricMarks);
    console.log('===========================');

    this.isLoading = true;

    this.resultsService
      .updateQuestionRubrics(
        this.selectedStudent.studentId,
        parseInt(this.selectedClass),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
        this.currentQuestion.questionNumber,
        rubricMarks,
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          console.log('✅ Marks saved successfully');
          this.toastService.showSuccess(
            'Success',
            `Question ${this.currentQuestion?.questionNumber} marks saved!`,
          );

          // Update the marks in currentResults
          if (this.currentResults && this.currentQuestion) {
            const questionIndex = this.currentResults.questions.findIndex(
              (q) => q.questionNumber === this.currentQuestion!.questionNumber,
            );
            if (questionIndex !== -1) {
              // Recalculate total marks from rubrics
              const totalMarks = this.getTotalRubricMarks(this.currentQuestion);
              this.currentResults.questions[questionIndex].marksObtained =
                totalMarks;
              this.currentQuestion.marksObtained = totalMarks;
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error saving marks:', error);
          console.error('Error details:', error.error);
          this.toastService.showError(
            'Error',
            'Failed to save marks. Please try again.',
          );
        },
      });
  }

  updateAllMarks(): void {
    if (!this.selectedStudent || !this.currentResults) return;

    const updatedMarks: { [key: number]: number } = {};
    this.currentResults.questions.forEach((q) => {
      updatedMarks[q.questionNumber] = q.marksObtained;
    });

    this.isLoading = true;
    this.resultsService
      .updateMarks(this.selectedStudent.studentId, updatedMarks)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.showSuccess(
            'Success',
            'All marks updated successfully!',
          );
        },
        error: () => {
          this.isLoading = false;
          this.toastService.showError('Error', 'Error updating marks');
        },
      });
  }

  // ✅✅✅ MODIFIED: VALIDATE BEFORE PROCEEDING ✅✅✅
  saveAndNext(): void {
    // ✅ Validate before saving
    if (this.hasValidationError(this.currentQuestion!)) {
      this.toastService.showError(
        'Cannot Proceed',
        'Please fix validation errors before moving to next question'
      );
      return;
    }

    this.updateCurrentQuestionMarks();
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      setTimeout(() => this.nextQuestion(), 500);
    }
  }

  // ✅✅✅ MODIFIED: VALIDATE BEFORE PROCEEDING ✅✅✅
  saveAndPrevious(): void {
    // ✅ Validate before saving
    if (this.hasValidationError(this.currentQuestion!)) {
      this.toastService.showError(
        'Cannot Proceed',
        'Please fix validation errors before moving to previous question'
      );
      return;
    }

    this.updateCurrentQuestionMarks();
    if (this.currentQuestionIndex > 0) {
      setTimeout(() => this.previousQuestion(), 500);
    }
  }

  updateMarks(): void {
    if (!this.selectedStudent || !this.currentResults) return;

    const updatedMarks: { [key: number]: number } = {};
    this.currentResults.questions.forEach((q) => {
      updatedMarks[q.questionNumber] = q.marksObtained;
    });

    this.isLoading = true;
    this.resultsService
      .updateMarks(this.selectedStudent.studentId, updatedMarks)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.showSuccess(
            'Success',
            'All marks updated successfully!',
          );
        },
        error: () => {
          this.isLoading = false;
          this.toastService.showError('Error', 'Error updating marks');
        },
      });
  }

  // ✅ NEW: Check if value is valid 0.5 increment
isValidHalfIncrement(value: number): boolean {
  // Check if the value is a valid multiple of 0.5
  // Valid: 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, etc.
  return (value * 2) % 1 === 0;
}

// ✅ NEW: Round to nearest 0.5
roundToHalfIncrement(value: number): number {
  return Math.round(value * 2) / 2;
}
}