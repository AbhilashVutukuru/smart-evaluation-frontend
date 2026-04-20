import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherService } from '../../../core/services/teacher.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { BaseComponent } from '../../../core/base/base.component'; // ← 1. import base

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css'],
  encapsulation: ViewEncapsulation.None,
})

export class TeacherListComponent extends BaseComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router         = inject(Router);
  private toastService   = inject(ToastService);
  private errorHandler   = inject(ErrorHandlerService);

  teachers:         any[] = [];
  filteredTeachers: any[] = [];
  loading    = false;
  searchTerm = '';

  showDeleteModal  = false;
  teacherToDelete: any = null;

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading = true;

    this.teacherService.getTeachers()
      .pipe(this.cancelOnDestroy())  
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.teachers         = response.data;
            this.filteredTeachers = response.data;
            if (this.teachers.length === 0) {
              this.toastService.showInfo('No Teachers', 'No teachers found in the system');
            }
          } else {
            this.teachers         = [];
            this.filteredTeachers = [];
            this.toastService.showInfo('No Data', 'No teachers found');
          }
        },
        error: (error) => {
          this.loading          = false;
          this.teachers         = [];
          this.filteredTeachers = [];
          this.errorHandler.handle('Failed to load teachers', error);
        },
      });
  }

  onSearchInput(): void {
    if (this.searchTerm.trim()) {
      this.filteredTeachers = this.teachers.filter((t) =>
        t.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase())    ||
        t.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase())     ||
        t.employeeCode?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredTeachers = this.teachers;
    }
  }

  clearSearch(): void {
    this.searchTerm       = '';
    this.filteredTeachers = this.teachers;
  }

  addTeacher(): void { this.router.navigate(['/registration/teacher']); }

  viewDetails(id: number): void {
    if (!id) { this.toastService.showWarning('Invalid Action', 'Teacher ID is missing'); return; }
    this.router.navigate(['/teachers/view', id]);
  }

  editTeacher(id: number): void {
    if (!id) { this.toastService.showWarning('Invalid Action', 'Teacher ID is missing'); return; }
    this.router.navigate(['/teachers/edit', id]);
  }

  deleteTeacher(teacher: any): void {
    if (!teacher?.id) {
      this.toastService.showWarning('Invalid Action', 'Cannot delete: Invalid teacher data');
      return;
    }
    this.teacherToDelete = teacher;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.teacherToDelete) return;

    this.teacherService.deleteTeacher(this.teacherToDelete.id)
      .pipe(this.cancelOnDestroy())  
      .subscribe({
        next: (response) => {
          this.showDeleteModal = false;
          this.teacherToDelete = null;
          if (response.success) {
            this.toastService.showSuccess('Success', 'Teacher deleted successfully');
            this.loadTeachers();
          } else {
            this.toastService.showError('Error', 'Failed to delete teacher. Please try again.');
          }
        },
        error: (error) => {
          this.showDeleteModal = false;
          this.teacherToDelete = null;
          this.errorHandler.handle('Failed to delete teacher', error);
        },
      });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.teacherToDelete = null;
  }

  getTeacherFullName(teacher: any): string {
    if (!teacher) return '';
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  }
}