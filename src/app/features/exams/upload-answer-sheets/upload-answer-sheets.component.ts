import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentAnswerSheetService } from '../../../core/services/student-answer-sheet.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ClassDto,
  ExamTypeDto,
  MasterDataService,
  SectionDto,
  SubjectDto,
} from '../../../core/services/master-data.service';
import { ToastService } from '../../../shared/services/toast.service';

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
  private authService = inject(AuthService);
  private masterDataService = inject(MasterDataService);
  private toastService = inject(ToastService);

  // Filters
  filters = {
    classId: '',
    sectionId: '',
    subjectId: '',
    examTypeId: '',
    absentStudentIds: [] as number[],
  };

  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];
  examTypes: ExamTypeDto[] = [];

  selectedClass: string = '';
  selectedSection: string = '';
  selectedSubject: string = '';
  selectedExamType: string = '';

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

  onClassChange(classId: string): void {
    // Reset dependent dropdowns
    this.selectedSection = '';
    this.selectedSubject = '';
    this.selectedExamType = '';
    this.sections = [];
    this.subjects = [];
    this.examTypes = [];
    //this.students = [];

    if (!classId) {
      return;
    }

    // ✅ Load sections for selected class
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {   
         this.error = error.error?.message || 'Failed to load sections';    
      },
    });

    // ✅ Load subjects for selected class
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (error) => {    
        this.error = error.error?.message || 'Failed to load subjects';  
      },
    });

    // ✅ Load exam types for selected class
    this.masterDataService.getExamTypesByClass(classId).subscribe({
      next: (examTypes) => {
        this.examTypes = examTypes;
      },
      error: (error) => {       
             this.error = error.error?.message || 'Failed to load exam types';  
      },
    });
  }

  showStudents(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.showStudentsCard = false; // Reset card visibility
    this.isEvaluationCompleted = false; // ✅ Reset evaluation status
    this.filters.absentStudentIds = []; // ✅ Clear absent students list when loading new students

    if (!this.filters.classId ||!this.filters.sectionId ||!this.filters.subjectId ||!this.filters.examTypeId) 
     {
      this.error ='Please select all required fields';    
      this.loading = false;
      return;
    }  

    this.studentAnswerService
      .getStudentsWithUploadStatus(+this.filters.classId,+this.filters.sectionId,+this.filters.subjectId,  
        +this.filters.examTypeId,
      )
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data.students)) {
            const rawStudents = response.data.students;

            if (rawStudents.length > 0) {
              this.students = rawStudents.map((s: any) => ({
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
              }));
              
              // ✅ Populate absentStudentIds with students already marked as absent
              this.filters.absentStudentIds = this.students
                .filter(student => student.isAbsent)
                .map(student => student.studentId);
            }
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

  validateFilters(): void {
  if (
    this.filters.classId &&
    this.filters.sectionId &&
    this.filters.subjectId &&
    this.filters.examTypeId
  ) {
    this.error = '';
  }
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

  submitAllStudents(): void {
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

    this.studentAnswerService.submitAllStudents(payload).subscribe({
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
