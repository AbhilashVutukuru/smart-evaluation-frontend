import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../core/services/teacher.service';
import { Router } from '@angular/router';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';

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

  teachers: any[] = [];
  filteredTeachers: any[] = [];
  loading = false;
  searchTerm = '';

   // Delete modal
  showDeleteModal = false;
  teacherToDelete: any = null;

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading = true;
    this.teacherService.getTeachers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.teachers = response.data;
          this.filteredTeachers = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading teachers', error);
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.filteredTeachers = this.teachers.filter(
      (t) =>
        t.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.employeeCode.toLowerCase().includes(this.searchTerm.toLowerCase()), //||
      //t.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addTeacher(): void {
    this.router.navigate(['/registration/teacher']);
  }

  viewDetails(id: number): void {
   this.router.navigate(['/teachers/view', id]);
  }

  editTeacher(id: number): void {
     this.router.navigate(['/teachers/edit', id]);
  }

  deleteTeacher(teacher: any): void {
    this.teacherToDelete = teacher;
    this.showDeleteModal = true;
  }

  // deleteTeacher(teacher: any): void {
  //   if (confirm(`Delete ${teacher.firstName} ${teacher.lastName}?`)) {
  //     this.teacherService.deleteTeacher(teacher.id).subscribe({
  //       next: () => this.loadTeachers(),
  //       error: (error) => console.error('Delete error', error),
  //     });
  //   }
  // }

  onDeleteConfirmed(): void {
    if (this.teacherToDelete) {
      this.teacherService.deleteTeacher(this.teacherToDelete.id).subscribe({
        next: () => {
          this.loadTeachers();
          this.showDeleteModal = false;
          this.teacherToDelete = null;
        },
        error: (error) => {
          console.error('Delete error', error);
          this.showDeleteModal = false;
          this.teacherToDelete = null;
        }
      });
    }
  }

   onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.teacherToDelete = null;
  }
}
