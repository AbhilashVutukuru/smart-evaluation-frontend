import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentAnswerSheetService } from '../../../core/services/student-answer-sheet.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExamService } from '../../../core/services/exam.service';

interface StudentUploadStatus {
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

@Component({
  selector: 'app-upload-student-marks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-answer-sheets.component.html',
  styleUrls: ['./upload-answer-sheets.component.css'],
})
export class UploadAnswerSheetsComponent implements OnInit {
  private studentAnswerService = inject(StudentAnswerSheetService);
  private registrationService = inject(RegistrationService);
  private examService = inject(ExamService);
  private authService = inject(AuthService);

  // Filters
  filters = {
    classId: '',
    sectionId: '',
    subjectId: '',
    examTypeId: '',
    absentStudentIds: [] as number[],
  };

  allClasses: any[] = [];
  allSections: any[] = [];
  allSubjects: any[] = [];
  allExamTypes: any[] = [];

  students: StudentUploadStatus[] = [];
  showStudentsCard = false;
  loading = false;
  error = '';
  success = '';
  isEvaluationCompleted = false;

  // Statistics
  get totalStudents(): number {
    return this.students.length;
  }

  get absentCount(): number {
    return this.students.filter((s) => s.isAbsent).length;
  }

  get uploadedCount(): number {
    return this.students.filter((s) => s.isUploaded).length;
  }

  get pendingCount(): number {
    return this.students.filter((s) => !s.isUploaded && !s.isAbsent).length;
  }

  get canEvaluate(): boolean {
    //return this.students.some((s) => s.isUploaded);
    if (!this.students || this.students.length === 0) {
      return false;
    }    

    return this.students.every((s) => s.isUploaded || s.isAbsent);
  }

  ngOnInit(): void {
    this.loadClasses();
    this.loadExamTypes();
  }

  getUserInitial(): string {
    const user = this.authService.currentUserValue;
    return user?.userName?.substring(0, 2).toUpperCase() || 'U';
  }

  getUserName(): string {
    return this.authService.currentUserValue?.userName || 'User';
  }

  getUserEmail(): string {
    return this.authService.currentUserValue?.email || '';
  }

  loadClasses(): void {
    this.registrationService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allClasses = response.data;
        }
      },
    });
  }

  onClassChange(): void {
    if (this.filters.classId) {
      this.loadSections(+this.filters.classId);
      this.loadSubjects();
    }
  }

  loadSections(classId: number): void {
    this.registrationService.getSections(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allSections = response.data;
        }
      },
    });
  }

  loadSubjects(): void {
    this.registrationService.getAllSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allSubjects = response.data;
        }
      },
    });
  }

  loadExamTypes(): void {
    this.examService.getExamTypes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allExamTypes = response.data;
        }
      },
    });
  }

  showStudents(): void {
    if (
      !this.filters.classId ||
      !this.filters.sectionId ||
      !this.filters.subjectId ||
      !this.filters.examTypeId
    ) {
      this.error = 'Please select all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    this.studentAnswerService
      .getStudentsWithUploadStatus(
        +this.filters.classId,
        +this.filters.sectionId,
        +this.filters.subjectId,
        +this.filters.examTypeId,
      )
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data.students)) {
            this.students = response.data.students.map((s: any) => {
              // const [firstName, ...lastNameParts] = (s.studentName || '').split(
              //   ' ',
              // );

              return {
                studentId: s.studentId,
                rollNumber: s.rollNumber,
                studentName: s.studentName,
                className: s.className,
                sectionName: s.sectionName,
                isAbsent: s.isAbsent ?? false,
                isUploaded:
                  s.status?.toLowerCase().includes('uploaded') === true &&
                  !s.status?.toLowerCase().includes('not'),
                  fileName: s.fileName || s.documentName || '',
              };
            });

            //  If everything is already completed, lock evaluation on load
            // this.isEvaluationCompleted = this.students.every(
            //   (s) => s.isUploaded || s.isAbsent,
            // );
            this.showStudentsCard = true;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to load students';
          this.loading = false;
        },
      });
  }

  onFileSelected(event: any, student: StudentUploadStatus): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      student.answerSheetFile = file;
      this.uploadAnswerSheet(student);
    } else {
      this.error = 'Please select a PDF file';
    }
  }

  uploadAnswerSheet(student: StudentUploadStatus): void {
    if (!student.answerSheetFile) return;
    student.isUploading = true;

    const formData = new FormData();
    formData.append('StudentAnswerSheetFile', student.answerSheetFile);
    formData.append('StudentId', student.studentId.toString());
    formData.append('ClassId', this.filters.classId);
    formData.append('SectionId', this.filters.sectionId);
    formData.append('SubjectId', this.filters.subjectId);
    formData.append('ExamTypeId', this.filters.examTypeId);

    this.studentAnswerService.uploadStudentAnswer(formData).subscribe({
      next: (response) => {
        if (response.success) {
          student.isUploaded = true;
          student.fileName = student.answerSheetFile?.name;
          this.success = `Answer sheet uploaded for ${student.studentName}`;
          setTimeout(() => (this.success = ''), 3000);
        }
        student.isUploading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to upload answer sheet';
        setTimeout(() => (this.error = ''), 3000);
        student.isUploading = false;
      },
    });
  }

  toggleAbsent(student: StudentUploadStatus): void {
    student.isAbsent = !student.isAbsent;

    if (student.isAbsent) {
      // when marked absent
      student.isUploaded = false;
      student.answerSheetFile = undefined;

      if (!this.filters.absentStudentIds.includes(student.studentId)) {
        this.filters.absentStudentIds.push(student.studentId);
      }
    } else {
      // when unmarked absent
      this.filters.absentStudentIds = this.filters.absentStudentIds.filter(
        (id) => id !== student.studentId,
      );
    }
  }

  evaluateStudents(): void {
    if (!this.canEvaluate) return;

    this.loading = true;
    this.error = '';

    const payload = {
      classId: +this.filters.classId,
      sectionId: +this.filters.sectionId,
      subjectId: +this.filters.subjectId,
      examTypeId: +this.filters.examTypeId,
      absentStudentIds: this.filters.absentStudentIds,
    };

    this.studentAnswerService.startEvaluation(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Evaluation started successfully';
          this.isEvaluationCompleted = true;

          // // ✅ After evaluation, make absent behave like completed
          // this.students.forEach((student) => {
          //   if (student.isAbsent) {
          //     student.isUploaded = true;
          //   }
          // });
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to start evaluation';
        this.loading = false;
      },
    });
  }
}
