import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherSubjectService } from '../../../core/services/teacher-subject.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { TeacherService } from '../../../core/services/teacher.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './assign-teacher-subjects.component.html',
  styleUrls: ['./assign-teacher-subjects.component.css']
})
export class AssignTeacherSubjectsComponent implements OnInit {
  private teacherSubjectService = inject(TeacherSubjectService);
  private registrationService = inject(RegistrationService);
  private teacherService = inject(TeacherService);

  // Dropdowns
  teachers: any[] = [];
  classes: any[] = [];
  sections: any[] = [];
  subjects: any[] = [];

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
      }
    });
  }

  loadClasses(): void {
    this.registrationService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.classes = response.data;
        }
      }
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
    this.registrationService.getSections(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sections = response.data;
        }
      }
    });
  }

  loadSubjects(classId: number): void {
    this.registrationService.getSubjects(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects = response.data;
        }
      }
    });
  }

  loadExistingAssignments(): void {
    this.teacherSubjectService.getTeacherAssignments(+this.selectedTeacherId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.existingAssignments = response.data;
        }
      }
    });
  }

  addAssignment(): void {
    if (!this.selectedClassId || !this.selectedSectionId || !this.selectedSubjectId) {
      this.error = 'Please select class, section and subject';
      return;
    }

    const classObj = this.classes.find(c => c.id == this.selectedClassId);
    const sectionObj = this.sections.find(s => s.id == this.selectedSectionId);
    const subjectObj = this.subjects.find(s => s.id == this.selectedSubjectId);

    const assignment: Assignment = {
      classId: +this.selectedClassId,
      sectionId: +this.selectedSectionId,
      subjectId: +this.selectedSubjectId,
      className: classObj?.className,
      sectionName: sectionObj?.sectionName,
      subjectName: subjectObj?.subjectName
    };

    // Check for duplicates
    const exists = this.assignments.some(a => 
      a.classId === assignment.classId && 
      a.sectionId === assignment.sectionId && 
      a.subjectId === assignment.subjectId
    );

    if (exists) {
      this.error = 'This assignment already exists in the list';
      return;
    }

    this.assignments.push(assignment);
    this.error = '';

    // Reset selections
    this.selectedClassId = '';
    this.selectedSectionId = '';
    this.selectedSubjectId = '';
    this.sections = [];
    this.subjects = [];
  }

  removeAssignment(index: number): void {
    this.assignments.splice(index, 1);
  }

  submitAssignments(): void {
    if (!this.selectedTeacherId) {
      this.error = 'Please select a teacher';
      return;
    }

    if (this.assignments.length === 0) {
      this.error = 'Please add at least one assignment';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      teacherId: +this.selectedTeacherId,
      assignments: this.assignments.map(a => ({
        classId: a.classId,
        sectionId: a.sectionId,
        subjectId: a.subjectId
      }))
    };

    this.teacherSubjectService.assignSubjectsToTeacher(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Subjects assigned successfully!';
          this.assignments = [];
          this.loadExistingAssignments();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to assign subjects';
        this.loading = false;
      }
    });
  }

  removeExistingAssignment(assignmentId: number): void {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    this.teacherSubjectService.removeAssignment(assignmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Assignment removed successfully';
          this.loadExistingAssignments();
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to remove assignment';
      }
    });
  }
}