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
  ClassDto,
  ExamTypeDto,
  MasterDataService,
  SectionDto,
  SubjectDto,
} from '../../../core/services/master-data.service';

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
  private masterDataService = inject(MasterDataService);

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

  searchCompleted = false;
  error = '';
   success = '';

  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];
  examTypes: ExamTypeDto[] = [];

  currentQuestionIndex = 0;
  totalQuestions = 0;
  currentQuestion: ExamQuestion | null = null;
  isLoadingQuestion = false;

  isEditMode = false;
  originalQuestion: ExamQuestion | null = null;

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load classes');
      },
    });
  }

  onClassSelected(classId: string): void {
    this.selectedSection = '';
    this.selectedSubject = '';
    this.selectedExamType = '';
    this.sections = [];
    this.subjects = [];
    this.examTypes = [];
    this.students = [];
    this.showStudentCard = false;
    this.showResultsCard = false;

    if (!classId) return;

    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
      this.error = error.error?.message || 'Failed to load sections';    
      },
    });

    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (error) => {
           this.error = error.error?.message || 'Failed to load subjects';  
      },
    });

    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.examTypes = examTypes;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load exam types';  
      },
    });
  }

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
    this.isEditMode = false;
    this.originalQuestion = null;
  }

  getStudents(): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';   
    this.clearStudentData(); 

     if (!this.selectedClass ||!this.selectedSection ||!this.selectedSubject ||!this.selectedExamType) 
     {
      this.error ='Please select all required fields';    
      this.isLoading = false;
      return;
    }

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
          this.searchCompleted = true;          
        },
        error: (err) => {
          this.isLoading = false;
          this.searchCompleted = true;
          this.error = err.error?.message || 'Error loading students';          
        },
      });
  }

   validateFilters(): void {
  if (
    this.selectedClass &&
    this.selectedSection &&
    this.selectedSubject &&
    this.selectedExamType
  ) {
    this.error = '';
  }
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

  loadQuestion(index: number): void {
    if (!this.currentResults || !this.selectedStudent) return;

    this.isLoadingQuestion = true;

    this.resultsService
      .getQuestionDetails(
        this.selectedStudent.studentId,
        parseInt(this.selectedClass),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
        index + 1,
      )
      .subscribe({
        next: (question: ExamQuestion) => {
          this.currentQuestion = question;
          this.currentQuestionIndex = index;
          this.isLoadingQuestion = false;
          this.isEditMode = false;
          this.originalQuestion = JSON.parse(JSON.stringify(question));
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

  // ✅ FIXED: Calculate max marks from questions if not provided
  getMaxMarks(): number {
    if (!this.currentResults) return 0;

    // If maxMarks is set, use it
    if (
      this.currentResults.maxMarks !== undefined &&
      this.currentResults.maxMarks !== null
    ) {
      return this.currentResults.maxMarks;
    }

    // Otherwise calculate from questions
    if (
      this.currentResults.questions &&
      this.currentResults.questions.length > 0
    ) {
      return this.currentResults.questions.reduce(
        (sum, q) => sum + q.maxMarks,
        0,
      );
    }

    return 0;
  }

  getPercentage(): number {
    const maxMarks = this.getMaxMarks();
    if (!this.currentResults || maxMarks === 0) return 0;

    const total = this.getTotalMarks();
    return (total / maxMarks) * 100;
  }

  hasValidationError(question: ExamQuestion | null): boolean {
    if (!question || !question.rubrics || question.rubrics.length === 0) {
      return false;
    }

    const hasIndividualRubricError = question.rubrics.some(
      (rubric) => rubric.marksGiven > rubric.maxMarks,
    );

    const totalRubricMarks = this.getTotalRubricMarks(question);
    const hasTotalMarksError = totalRubricMarks > question.maxMarks;

    return hasIndividualRubricError || hasTotalMarksError;
  }

  onRubricMarksChange(rubric: any, question: ExamQuestion): void {
    if (rubric.marksGiven < 0) {
      rubric.marksGiven = 0;
    }

    if (rubric.marksGiven !== null && rubric.marksGiven !== undefined) {
      rubric.marksGiven = this.roundToHalfIncrement(rubric.marksGiven);
    }

    question.marksObtained = this.getTotalRubricMarks(question);
  }

  onRubricBlur(rubric: any, question: ExamQuestion): void {
    if (rubric.marksGiven !== null && rubric.marksGiven !== undefined) {
      const numValue = parseFloat(rubric.marksGiven.toString());
      rubric.marksGiven = this.roundToHalfIncrement(numValue);
      question.marksObtained = this.getTotalRubricMarks(question);
    }
  }

  getTotalRubricMarks(question: ExamQuestion): number {
    if (!question.rubrics || question.rubrics.length === 0) return 0;
    return question.rubrics.reduce(
      (sum, rubric) => sum + (rubric.marksGiven || 0),
      0,
    );
  }

  updateCurrentQuestionMarks(): void {
    if (!this.selectedStudent || !this.currentQuestion) {
      this.toastService.showWarning('Warning', 'No question selected');
      return;
    }

    if (this.hasValidationError(this.currentQuestion)) {
      const totalMarks = this.getTotalRubricMarks(this.currentQuestion);
      this.toastService.showError(
        'Cannot Save',
        `Total marks (${totalMarks}) exceed maximum (${this.currentQuestion.maxMarks})`,
      );
      return;
    }

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

    const rubricMarks = this.currentQuestion.rubrics.map((rubric) => {
      const rubricId =
        rubric.questionPaperRubricId ||
        rubric.id ||
        (rubric as any).QuestionPaperRubricId ||
        0;

      const marksGiven =
        rubric.marksGiven ||
        rubric.marksAssignedByTeacher ||
        (rubric as any).MarksGiven ||
        (rubric as any).MarksAssignedByTeacher ||
        0;

      return {
        questionPaperRubricId: rubricId,
        marksGiven: marksGiven,
      };
    });

    const invalidRubrics = rubricMarks.filter(
      (r) => r.questionPaperRubricId === 0,
    );
    if (invalidRubrics.length > 0) {
      this.toastService.showError('Error', 'Invalid rubric data - missing IDs');
      return;
    }

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
          this.isEditMode = false;

          if (this.currentQuestion) {
            this.originalQuestion = JSON.parse(
              JSON.stringify(this.currentQuestion),
            );
          }

          this.toastService.showSuccess(
            'Success',
            `Question ${this.currentQuestion?.questionNumber} marks saved!`,
          );

          if (this.currentResults && this.currentQuestion) {
            const questionIndex = this.currentResults.questions.findIndex(
              (q) => q.questionNumber === this.currentQuestion!.questionNumber,
            );
            if (questionIndex !== -1) {
              const totalMarks = this.getTotalRubricMarks(this.currentQuestion);
              this.currentResults.questions[questionIndex].marksObtained =
                totalMarks;
              this.currentQuestion.marksObtained = totalMarks;
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.showError(
            'Error',
            'Failed to save marks. Please try again.',
          );
        },
      });
  }

  saveAndNext(): void {
    if (this.hasValidationError(this.currentQuestion!)) {
      this.toastService.showError(
        'Cannot Proceed',
        'Please fix validation errors before moving to next question',
      );
      return;
    }

    this.updateCurrentQuestionMarks();
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      setTimeout(() => this.nextQuestion(), 500);
    }
  }

  saveAndPrevious(): void {
    if (this.hasValidationError(this.currentQuestion!)) {
      this.toastService.showError(
        'Cannot Proceed',
        'Please fix validation errors before moving to previous question',
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

  enableEdit(): void {
    if (this.currentQuestion) {
      this.originalQuestion = JSON.parse(JSON.stringify(this.currentQuestion));
      this.isEditMode = true;
    }
  }

  cancelEdit(): void {
    if (!this.originalQuestion || !this.currentQuestion) {
      this.isEditMode = false;
      this.toastService.showInfo('Info', 'No changes to cancel');
      return;
    }

    this.currentQuestion.marksObtained = this.originalQuestion.marksObtained;

    if (this.originalQuestion.rubrics && this.currentQuestion.rubrics) {
      this.currentQuestion.rubrics.forEach((rubric, index) => {
        const originalRubric = this.originalQuestion?.rubrics?.[index];
        if (originalRubric) {
          rubric.marksGiven = originalRubric.marksGiven;
        }
      });
    }

    this.isEditMode = false;
    this.toastService.showInfo(
      'Info',
      'Changes cancelled - original values restored',
    );
  }

  isValidHalfIncrement(value: number): boolean {
    return (value * 2) % 1 === 0;
  }

  roundToHalfIncrement(value: number): number {
    return Math.round(value * 2) / 2;
  }

  downloadAnswerSheet(): void {
    if (!this.selectedStudent) {
      this.toastService.showWarning('Warning', 'No student selected');
      return;
    }

    this.isLoading = true;

    this.resultsService
      .downloadStudentAnswerSheet(
        this.selectedStudent.studentId,
        parseInt(this.selectedClass),
        parseInt(this.selectedSubject),
        parseInt(this.selectedExamType),
      )
      .subscribe({
        next: (blob: Blob) => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.selectedStudent?.studentName}_AnswerSheet.pdf`;

          // Trigger download
          document.body.appendChild(link);
          link.click();

          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.isLoading = false;
          this.toastService.showSuccess(
            'Success',
            'Answer sheet downloaded successfully',
          );
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Download error:', error);
          this.toastService.showError(
            'Error',
            error.error?.message || 'Failed to download answer sheet',
          );
        },
      });
  }
}
