import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { Router, ActivatedRoute } from '@angular/router';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css'],
})
export class StudentListComponent implements OnInit {
  private studentService    = inject(StudentService);
  private router            = inject(Router);
  private route             = inject(ActivatedRoute);
  private masterDataService = inject(MasterDataService);
  private toastService      = inject(ToastService);
  private errorHandler      = inject(ErrorHandlerService);

  // Data
  students:         any[]        = [];
  filteredStudents: any[]        = [];
  classes:          ClassDto[]   = [];
  sections:         SectionDto[] = [];

  // State
  loading         = false;
  searchTerm      = '';
  selectedClass   = '';
  selectedSection = '';

  // Delete modal
  showDeleteModal  = false;
  studentToDelete: any = null;

  // Validation
  touchedFields: Set<string> = new Set();
  searchError = '';

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.loadClasses();

    // Restore filter state from query params (set when navigating away)
    const qp = this.route.snapshot.queryParams;
    if (qp['classId'] && qp['sectionId']) {
      this.selectedClass   = qp['classId'];
      this.selectedSection = qp['sectionId'];

      // Load sections for the restored class, then load students
      this.masterDataService.getSectionsByClass(+this.selectedClass).subscribe({
        next: (sections) => {
          this.sections = sections;
          this.loadStudents();
        },
        error: (error) => this.errorHandler.handle('Failed to load sections', error),
      });
    }
  }

  // ============================================
  // Load Data
  // ============================================

  private loadClasses(): void {
    this.masterDataService.getClasses().subscribe({
      next: (classes) => (this.classes = classes),
      error: (error)  => this.errorHandler.handle('Failed to load classes', error),
    });
  }

  private loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => (this.sections = sections),
      error: (error)   => this.errorHandler.handle('Failed to load sections', error),
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
          this.students         = response.data;
          this.filteredStudents = response.data;

          if (this.students.length === 0) {
            this.toastService.showInfo('No Results', 'No students found for the selected class and section');
          }
        } else {
          this.students         = [];
          this.filteredStudents = [];
          this.toastService.showInfo('No Data', response.message || 'No students found');
        }
      },
      error: (error) => {
        this.loading          = false;
        this.students         = [];
        this.filteredStudents = [];
        this.errorHandler.handle('Failed to load students', error);
      },
    });
  }

  // ============================================
  // Change Handlers
  // ============================================

  onClassChange(): void {
    this.selectedSection  = '';
    this.sections         = [];
    this.students         = [];
    this.filteredStudents = [];

    if (this.selectedClass) {
      this.loadSections(+this.selectedClass);
    }
  }

  onSectionChange(): void {
    this.students         = [];
    this.filteredStudents = [];

    if (this.selectedClass && this.selectedSection) {
      this.loadStudents();
    }
  }

  // ============================================
  // Search
  // ============================================

  onSearchInput(): void {
    if (this.searchTerm.trim()) {
      this.searchError      = '';
      this.filteredStudents = this.students.filter((s) =>
        s.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase())  ||
        s.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase())   ||
        s.rollNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredStudents = this.students;
    }
  }

  onSearchBlur(): void {
    this.touchedFields.add('search');
    this.searchError =
      this.touchedFields.has('search') && !this.searchTerm.trim() && this.students.length > 0
        ? 'Search term cannot be empty'
        : '';
  }

  onSearchFocus(): void {
    this.searchError = '';
  }

  clearSearch(): void {
    this.searchTerm       = '';
    this.searchError      = '';
    this.filteredStudents = this.students;
    this.touchedFields.delete('search');
  }

  // ============================================
  // Navigation
  // ============================================

  addStudent(): void {
    this.router.navigate(['/registration/student']);
  }

  viewDetails(id: number): void {
    if (!id) { this.toastService.showWarning('Invalid Action', 'Student ID is missing'); return; }
    this.router.navigate(['/students/view', id], {
      queryParams: { classId: this.selectedClass, sectionId: this.selectedSection }
    });
  }

  editStudent(id: number): void {
    if (!id) { this.toastService.showWarning('Invalid Action', 'Student ID is missing'); return; }
    this.router.navigate(['/students/edit', id], {
      queryParams: { classId: this.selectedClass, sectionId: this.selectedSection }
    });
  }

  // ============================================
  // Delete Operations
  // ============================================

  deleteStudent(student: any): void {
    if (!student?.id) {
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
        this.errorHandler.handle('Failed to delete student', error);
      },
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal  = false;
    this.studentToDelete  = null;
  }

  // ============================================
  // Helpers
  // ============================================

  getStudentFullName(student: any): string {
    if (!student) return '';
    return `${student.firstName || ''} ${student.lastName || ''}`.trim();
  }
}