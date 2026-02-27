import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { Router } from '@angular/router';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css'],
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private router = inject(Router);
  private masterDataService = inject(MasterDataService);
  private toastService = inject(ToastService);

  // Data
  students: any[] = [];
  filteredStudents: any[] = [];
  classes: ClassDto[] = [];
  sections: SectionDto[] = [];

  // State
  loading = false;
  searchTerm = '';
  selectedClass = '';
  selectedSection = '';

  // Delete modal
  showDeleteModal = false;
  studentToDelete: any = null;

  // ✅ Validation
  touchedFields: Set<string> = new Set();
  searchError = '';

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.loadClasses();
  }

  // ============================================
  // Load Data
  // ============================================

  private loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
      },
      error: (error) => {
        this.handleError('Failed to load classes', error);
      },
    });
  }

  private loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.handleError('Failed to load sections', error);
      },
    });
  }

  loadStudents(): void {
    if (!this.selectedClass || !this.selectedSection) {
      this.toastService.showWarning('Selection Required', 'Please select class and section');
      return;
    }

    this.loading = true;

    this.studentService.getStudents(this.selectedClass, this.selectedSection).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success && response.data) {
          this.students = response.data;
          this.filteredStudents = response.data;

          if (this.students.length === 0) {
            this.toastService.showInfo('No Results', 'No students found for the selected class and section');
          }
        } else {
          this.students = [];
          this.filteredStudents = [];
          this.toastService.showInfo('No Data', response.message || 'No students found');
        }
      },
      error: (error) => {
        this.loading = false;
        this.students = [];
        this.filteredStudents = [];
        this.handleError('Failed to load students', error);
      }
    });
  }

  // ============================================
  // Change Handlers
  // ============================================

  onClassChange(): void {
    this.selectedSection = '';
    this.sections = [];
    this.students = [];
    this.filteredStudents = [];

    if (this.selectedClass) {
      this.loadSections(+this.selectedClass);
    }
  }

  onSectionChange(): void {
    this.students = [];
    this.filteredStudents = [];

    if (this.selectedClass && this.selectedSection) {
      this.loadStudents();
    }
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
      this.filteredStudents = this.students.filter((s) =>
        s.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredStudents = this.students;
    }
  }

  onSearchBlur(): void {
    this.touchedFields.add('search');

    // Show error only if field was focused and is now empty
    if (this.touchedFields.has('search') && !this.searchTerm.trim() && this.students.length > 0) {
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
    this.filteredStudents = this.students;
  }

  // ============================================
  // Navigation
  // ============================================

  addStudent(): void {
    this.router.navigate(['/registration/student']);
  }

  viewDetails(id: number): void {
    if (!id) {
      this.toastService.showWarning('Invalid Action', 'Student ID is missing');
      return;
    }
    this.router.navigate(['/students/view', id]);
  }

  editStudent(id: number): void {
    if (!id) {
      this.toastService.showWarning('Invalid Action', 'Student ID is missing');
      return;
    }
    this.router.navigate(['/students/edit', id]);
  }

  // ============================================
  // Delete Operations
  // ============================================

  deleteStudent(student: any): void {
    if (!student || !student.id) {
      this.toastService.showWarning('Invalid Action', 'Cannot delete: Invalid student data');
      return;
    }

    this.studentToDelete = student;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.studentToDelete) return;

    this.studentService.deleteStudent(this.studentToDelete.id).subscribe({
      next: (response) => {
        this.showDeleteModal = false;
        const deletedStudent = this.studentToDelete;
        this.studentToDelete = null;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Student deleted successfully');
          this.loadStudents();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to delete student');
        }
      },
      error: (error) => {
        this.showDeleteModal = false;
        this.studentToDelete = null;
        this.handleError('Failed to delete student', error);
      }
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.studentToDelete = null;
  }

  // ============================================
  // Helper Methods
  // ============================================

  getStudentFullName(student: any): string {
    if (!student) return '';
    return `${student.firstName || ''} ${student.lastName || ''}`.trim();
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
    // Try error.error.message
    if (error?.error?.message) {
      return error.error.message;
    }

    // Try error.error.errors array
    if (error?.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }

    // Try error.message
    if (error?.message) {
      return error.message;
    }

    // Try error.error as string
    if (typeof error?.error === 'string') {
      return error.error;
    }

    // Try error.statusText
    if (error?.statusText) {
      return error.statusText;
    }

    return '';
  }

  private isProduction(): boolean {
    return false; // Change based on environment
  }
}