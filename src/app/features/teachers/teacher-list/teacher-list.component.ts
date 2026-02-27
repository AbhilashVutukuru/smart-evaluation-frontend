import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../core/services/teacher.service';
import { Router } from '@angular/router';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css'],
})
export class TeacherListComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // Data
  teachers: any[] = [];
  filteredTeachers: any[] = [];

  // State
  loading = false;
  searchTerm = '';

  // Delete modal
  showDeleteModal = false;
  teacherToDelete: any = null;

  // ✅ Validation
  touchedFields: Set<string> = new Set();
  searchError = '';

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.loadTeachers();
  }

  // ============================================
  // Load Data
  // ============================================

  loadTeachers(): void {
    this.loading = true;

    this.teacherService.getTeachers().subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success && response.data) {
          this.teachers = response.data;
          this.filteredTeachers = response.data;

          if (this.teachers.length === 0) {
            this.toastService.showInfo('No Teachers', 'No teachers found in the system');
          }
        } else {
          this.teachers = [];
          this.filteredTeachers = [];
          this.toastService.showInfo('No Data', response.message || 'No teachers found');
        }
      },
      error: (error) => {
        this.loading = false;
        this.teachers = [];
        this.filteredTeachers = [];
        this.handleError('Failed to load teachers', error);
      }
    });
  }

  // ============================================
  // ✅ Search with Blur Validation
  // ============================================

  onSearchInput(): void {
    // Clear error when user starts typing
    if (this.searchTerm.trim()) {
      this.searchError = '';
    }

    // Perform search
    if (this.searchTerm.trim()) {
      this.filteredTeachers = this.teachers.filter((t) =>
        t.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.employeeCode?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredTeachers = this.teachers;
    }
  }

  onSearchBlur(): void {
    this.touchedFields.add('search');

    // Show error only if field was focused and is now empty
    if (this.touchedFields.has('search') && !this.searchTerm.trim() && this.teachers.length > 0) {
      this.searchError = 'Search term cannot be empty';
    } else {
      this.searchError = '';
    }
  }

  onSearchFocus(): void {
    // Clear error when field is focused
    this.searchError = '';
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchError = '';
    this.touchedFields.delete('search');
    this.filteredTeachers = this.teachers;
  }

  // ============================================
  // Navigation
  // ============================================

  addTeacher(): void {
    this.router.navigate(['/registration/teacher']);
  }

  viewDetails(id: number): void {
    if (!id) {
      this.toastService.showWarning('Invalid Action', 'Teacher ID is missing');
      return;
    }
    this.router.navigate(['/teachers/view', id]);
  }

  editTeacher(id: number): void {
    if (!id) {
      this.toastService.showWarning('Invalid Action', 'Teacher ID is missing');
      return;
    }
    this.router.navigate(['/teachers/edit', id]);
  }

  // ============================================
  // Delete Operations
  // ============================================

  deleteTeacher(teacher: any): void {
    if (!teacher || !teacher.id) {
      this.toastService.showWarning('Invalid Action', 'Cannot delete: Invalid teacher data');
      return;
    }

    this.teacherToDelete = teacher;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.teacherToDelete) return;

    this.teacherService.deleteTeacher(this.teacherToDelete.id).subscribe({
      next: (response) => {
        this.showDeleteModal = false;
        const deletedTeacher = this.teacherToDelete;
        this.teacherToDelete = null;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Teacher deleted successfully');
          this.loadTeachers();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to delete teacher');
        }
      },
      error: (error) => {
        this.showDeleteModal = false;
        this.teacherToDelete = null;
        this.handleError('Failed to delete teacher', error);
      }
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.teacherToDelete = null;
  }

  // ============================================
  // Helper Methods
  // ============================================

  getTeacherFullName(teacher: any): string {
    if (!teacher) return '';
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  }

  // ============================================
  // ✅ Centralized Error Handling
  // ============================================

  private handleError(userMessage: string, error: any): void {
    const errorMessage = this.extractErrorMessage(error);

    if (!this.isProduction()) {
      console.error('Error Details:', {
        userMessage,
        error,
        errorMessage
      });
    }

    this.toastService.showError('Error', errorMessage || userMessage);
  }

  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (typeof error?.error === 'string') {
      return error.error;
    }
    
    if (error?.statusText) {
      return error.statusText;
    }
    
    return '';
  }

  private isProduction(): boolean {
    return false; // Change based on environment
  }
}