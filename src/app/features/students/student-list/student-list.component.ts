import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { Router } from '@angular/router';
import { RegistrationService } from '../../../core/services/registration.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css'],
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private registrationService = inject(RegistrationService);
  private router = inject(Router);
   private masterDataService = inject(MasterDataService);
    private toastService = inject(ToastService);

  students: any[] = [];
  filteredStudents: any[] = [];
  loading = false;
  searchTerm = '';
  selectedClass = '';
  selectedSection = '';

   classes: ClassDto[] = [];
    sections: SectionDto[] = [];

  // Delete modal
  showDeleteModal = false;
  studentToDelete: any = null;

  
  ngOnInit(): void {
    //this.loadStudents();
    this.loadClasses();
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

  onClassChange(): void {
    this.selectedSection = '';
    this.sections = [];
    this.students = [];
    this.filteredStudents = [];
    if (this.selectedClass) {
    this.masterDataService.getSectionsByClass(+this.selectedClass).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load sections');
      },
    });
    }
  }

  onSectionChange(): void {
    if (this.selectedClass && this.selectedSection) {
      this.loadStudents();
    }
  }

  loadStudents(): void {
    this.loading = true;
    this.studentService.getStudents(this.selectedClass, this.selectedSection).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.students = response.data;
          this.filteredStudents = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading students', error);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.filteredStudents = this.students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(this.searchTerm.toLowerCase()), //||
      //s.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  onFilter(): void {
    this.loadStudents();
  }
  addStudent(): void {
    this.router.navigate(['/registration/student']);
  }
  viewDetails(id: number): void {
    this.router.navigate(['/students/view', id]);
  }

  editStudent(id: number): void {
    this.router.navigate(['/students/edit', id]);
  }

  // deleteStudent(id: number): void {
  //   if (!confirm('Are you sure you want to delete this student?')) return;

  //   this.studentService.deleteStudent(id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.loadStudents();
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Delete failed', error);
  //     },
  //   });
  // }

  deleteStudent(student: any): void {
    this.studentToDelete = student;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (this.studentToDelete) {
      this.studentService.deleteStudent(this.studentToDelete.id).subscribe({
        next: () => {
          this.loadStudents();
          this.showDeleteModal = false;
          this.studentToDelete = null;
        },
        error: (error) => {
          console.error('Delete error', error);
          this.showDeleteModal = false;
          this.studentToDelete = null;
        }
      });
    }
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.studentToDelete = null;
  }
}
