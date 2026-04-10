import { Component, ViewEncapsulation, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherSubjectService } from '../../../core/services/teacher-subject.service';
import { TeacherService } from '../../../core/services/teacher.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ClassDto, MasterDataService, SectionDto, SubjectDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

interface Assignment {
  classId:     number;
  sectionId:   number;
  subjectId:   number;
  className?:  string;
  sectionName?: string;
  subjectName?: string;
}

@Component({
  selector: 'app-assign-teacher-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './assign-teacher-subjects.component.html',
  styleUrls: ['./assign-teacher-subjects.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AssignTeacherSubjectsComponent implements OnInit {
  private teacherSubjectService = inject(TeacherSubjectService);
  private teacherService        = inject(TeacherService);
  private masterDataService     = inject(MasterDataService);
  private toastService          = inject(ToastService);
  private errorHandler          = inject(ErrorHandlerService);

  // Dropdowns
  teachers: any[]      = [];
  classes:  ClassDto[] = [];
  sections: SectionDto[] = [];
  subjects: SubjectDto[] = [];

  // Selection
  selectedTeacherId = '';
  selectedClassId   = '';
  selectedSectionId = '';
  selectedSubjectId = '';

  // Assignments
  assignments:         Assignment[] = [];
  existingAssignments: any[]        = [];

  // UI state
  loading  = false;
  removing = false;

  // Remove modal
  showRemoveModal    = false;
  assignmentToRemove: any = null;

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.loadTeachers();
    this.loadClasses();
  }

  // ============================================
  // Load Data
  // ============================================

  loadTeachers(): void {
    this.teacherService.getTeachers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.teachers = response.data;
        }
      },
      error: (error) => this.errorHandler.handle('Failed to load teachers', error),
    });
  }

  loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => (this.classes = classes),
      error: (error)  => this.errorHandler.handle('Failed to load classes', error),
    });
  }

  loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => (this.sections = sections),
      error: (error)   => this.errorHandler.handle('Failed to load sections', error),
    });
  }

  loadSubjects(classId: number): void {
    this.masterDataService.getSubjectsByClass(classId).subscribe({
      next: (subjects) => (this.subjects = subjects),
      error: (error)   => this.errorHandler.handle('Failed to load subjects', error),
    });
  }

  loadExistingAssignments(): void {
    this.teacherSubjectService.getTeacherAssignments(+this.selectedTeacherId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.existingAssignments = response.data;
        }
      },
      error: (error) => this.errorHandler.handle('Failed to load existing assignments', error),
    });
  }

  // ============================================
  // Dropdown Change Handlers
  // ============================================

  onTeacherChange(): void {
    if (this.selectedTeacherId) {
      this.loadExistingAssignments();
    }
  }

  onClassChange(): void {
    this.selectedSectionId = '';
    this.selectedSubjectId = '';
    this.sections          = [];
    this.subjects          = [];

    if (this.selectedClassId) {
      this.loadSections(+this.selectedClassId);
      this.loadSubjects(+this.selectedClassId);
    }
  }

  // ============================================
  // Assignments
  // ============================================

  addAssignment(): void {
    if (!this.selectedClassId || !this.selectedSectionId || !this.selectedSubjectId) {
      this.toastService.showWarning('Warning', 'Please select class, section and subject');
      return;
    }

    const assignment: Assignment = {
      classId:     +this.selectedClassId,
      sectionId:   +this.selectedSectionId,
      subjectId:   +this.selectedSubjectId,
      className:   this.classes.find((c) => c.id === +this.selectedClassId)?.className,
      sectionName: this.sections.find((s) => s.id === +this.selectedSectionId)?.sectionName,
      subjectName: this.subjects.find((s) => s.id === +this.selectedSubjectId)?.subjectName,
    };

    const exists = this.assignments.some(
      (a) => a.classId === assignment.classId &&
             a.sectionId === assignment.sectionId &&
             a.subjectId === assignment.subjectId,
    );

    if (exists) {
      this.toastService.showWarning('Duplicate', 'This assignment already exists in the list');
      return;
    }

    this.assignments.push(assignment);
    this.toastService.showSuccess('Added', 'Assignment added to list');

    // Reset selections
    this.selectedClassId   = '';
    this.selectedSectionId = '';
    this.selectedSubjectId = '';
    this.sections          = [];
    this.subjects          = [];
  }

  removeAssignment(index: number): void {
    this.assignments.splice(index, 1);
    this.toastService.showInfo('Removed', 'Assignment removed from list');
  }

  submitAssignments(): void {
    if (!this.selectedTeacherId) {
      this.toastService.showWarning('Warning', 'Please select a teacher');
      return;
    }

    if (this.assignments.length === 0) {
      this.toastService.showWarning('Warning', 'Please add at least one assignment');
      return;
    }

    this.loading = true;

    const payload = {
      teacherId:   +this.selectedTeacherId,
      assignments: this.assignments.map((a) => ({
        classId:   a.classId,
        sectionId: a.sectionId,
        subjectId: a.subjectId,
      })),
    };

    this.teacherSubjectService.assignSubjectsToTeacher(payload).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.toastService.showSuccess('Success', 'Subjects assigned successfully!');
          this.assignments = [];
          this.loadExistingAssignments();
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to assign subjects', error);
      },
    });
  }

  // ============================================
  // Remove Modal
  // ============================================

  openRemoveModal(assignment: any): void {
    this.assignmentToRemove = assignment;
    this.showRemoveModal    = true;
  }

  confirmRemove(): void {
    if (!this.assignmentToRemove || this.removing) return;

    this.removing = true;

    this.teacherSubjectService.removeAssignment(this.assignmentToRemove.id).subscribe({
      next: (response) => {
        this.removing = false;
        if (response.success) {
          this.toastService.showSuccess('Success', 'Assignment removed successfully');
          this.loadExistingAssignments();
          this.closeRemoveModal();
        }
      },
      error: (error) => {
        this.removing = false;
        this.errorHandler.handle('Failed to remove assignment', error);
      },
    });
  }

  closeRemoveModal(): void {
    this.showRemoveModal    = false;
    this.assignmentToRemove = null;
  }
}