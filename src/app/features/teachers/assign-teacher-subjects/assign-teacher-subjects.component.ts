import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherSubjectService } from '../../../core/services/teacher-subject.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import {
  ClassDto,
  MasterDataService,
  SectionDto,
  SubjectDto,
} from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';

interface Assignment {
  classId: number;
  sectionId: number;
  subjectId: number;
  className?: string;
  sectionName?: string;
  subjectName?: string;
}

@Component({
  selector: 'app-assign-teacher-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './assign-teacher-subjects.component.html',
  styleUrls: ['./assign-teacher-subjects.component.css'],
})
export class AssignTeacherSubjectsComponent implements OnInit {
  private teacherSubjectService = inject(TeacherSubjectService);
  private teacherService = inject(TeacherService);
  private masterDataService = inject(MasterDataService);
  private toastService = inject(ToastService);

  // Dropdowns
  teachers: any[] = [];
  classes: ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];

  // Selection
  selectedTeacherId = '';
  selectedClassId = '';
  selectedSectionId = '';
  selectedSubjectId = '';

  // Assignments
  assignments: Assignment[] = [];
  existingAssignments: any[] = [];

  loading = false;
  error = '';
  success = '';

  showRemoveModal = false;
  assignmentToRemove: any = null;
  removing = false;

  ngOnInit(): void {
    this.loadTeachers();
    this.loadClasses();
  }

  loadTeachers(): void {
    this.teacherService.getTeachers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.teachers = response.data;
        }
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load teachers');
      },
    });
  }

  loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load classes');
      },
    });
  }

  onTeacherChange(): void {
    if (this.selectedTeacherId) {
      this.loadExistingAssignments();
    }
  }

  onClassChange(): void {
    this.selectedSectionId = '';
    this.selectedSubjectId = '';
    this.sections = [];
    this.subjects = [];

    if (this.selectedClassId) {
      this.loadSections(+this.selectedClassId);
      this.loadSubjects(+this.selectedClassId);
    }
  }

  loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load sections');
      },
    });
  }

  loadSubjects(classId: number): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load subjects');
      },
    });
  }

  loadExistingAssignments(): void {
    this.teacherSubjectService
      .getTeacherAssignments(+this.selectedTeacherId)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.existingAssignments = response.data;
          }
        },
        error: (error) => {
          this.toastService.showError('Error', 'Failed to load existing assignments');
        },
      });
  }

  addAssignment(): void {
    if (
      !this.selectedClassId ||
      !this.selectedSectionId ||
      !this.selectedSubjectId
    ) {
      this.error = 'Please select class, section and subject';
      this.toastService.showWarning('Warning', 'Please select class, section and subject');
      return;
    }

    const classObj = this.classes.find(
      (c) => c.id === Number(this.selectedClassId),
    );
    const sectionObj = this.sections.find(
      (s) => s.id === Number(this.selectedSectionId),
    );
    const subjectObj = this.subjects.find(
      (s) => s.id === Number(this.selectedSubjectId),
    );

    const assignment: Assignment = {
      classId: +this.selectedClassId,
      sectionId: +this.selectedSectionId,
      subjectId: +this.selectedSubjectId,
      className: classObj?.className,
      sectionName: sectionObj?.sectionName,
      subjectName: subjectObj?.subjectName,
    };

    // Check for duplicates
    const exists = this.assignments.some(
      (a) =>
        a.classId === assignment.classId &&
        a.sectionId === assignment.sectionId &&
        a.subjectId === assignment.subjectId,
    );

    if (exists) {
      this.error = 'This assignment already exists in the list';
      this.toastService.showWarning('Duplicate', 'This assignment already exists in the list');
      return;
    }

    this.assignments.push(assignment);
    this.error = '';
    this.toastService.showSuccess('Success', 'Assignment added to list');

    // Reset selections
    this.selectedClassId = '';
    this.selectedSectionId = '';
    this.selectedSubjectId = '';
    this.sections = [];
    this.subjects = [];
  }

  removeAssignment(index: number): void {
    this.assignments.splice(index, 1);
    this.toastService.showInfo('Removed', 'Assignment removed from list');
  }

  submitAssignments(): void {
    if (!this.selectedTeacherId) {
      this.error = 'Please select a teacher';
      this.toastService.showWarning('Warning', 'Please select a teacher');
      return;
    }

    if (this.assignments.length === 0) {
      this.error = 'Please add at least one assignment';
      this.toastService.showWarning('Warning', 'Please add at least one assignment');
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      teacherId: +this.selectedTeacherId,
      assignments: this.assignments.map((a) => ({
        classId: a.classId,
        sectionId: a.sectionId,
        subjectId: a.subjectId,
      })),
    };

    this.teacherSubjectService.assignSubjectsToTeacher(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Subjects assigned successfully!';
          this.toastService.showSuccess('Success', 'Subjects assigned successfully!');
          this.assignments = [];
          this.loadExistingAssignments();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message ?? 'Failed to assign subjects';
        this.toastService.showError('Error', error.error?.message ?? 'Failed to assign subjects');
        this.loading = false;
      },
    });
  }

  openRemoveModal(assignment: any): void {
    this.assignmentToRemove = assignment;
    this.showRemoveModal = true;
  }

  confirmRemove(): void {
    if (!this.assignmentToRemove || this.removing) return;

    this.removing = true;
    this.teacherSubjectService
      .removeAssignment(this.assignmentToRemove.id)
      .subscribe({
        next: (r) => {
          if (r.success) {
            this.success = 'Assignment removed successfully';
            this.toastService.showSuccess('Success', 'Assignment removed successfully');
            this.loadExistingAssignments();
            this.closeRemoveModal();
          }
          this.removing = false;
        },
        error: (error) => {
          this.error = error.error?.message ?? 'Failed to remove assignment';
          this.toastService.showError('Error', error.error?.message ?? 'Failed to remove assignment');
          this.removing = false;
        },
      });
  }

  closeRemoveModal(): void {
    this.showRemoveModal = false;
    this.assignmentToRemove = null;
  }
}