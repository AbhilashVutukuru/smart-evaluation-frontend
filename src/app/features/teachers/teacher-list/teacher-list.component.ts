import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../core/services/teacher.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css']
})
export class TeacherListComponent implements OnInit {
  private teacherService = inject(TeacherService);
   private router = inject(Router);

  teachers: any[] = [];
  filteredTeachers: any[] = [];
  loading = false;
  searchTerm = '';

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
      }
    });
  }

  onSearch(): void {
    this.filteredTeachers = this.teachers.filter(t => 
      t.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      t.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      t.employeeCode.toLowerCase().includes(this.searchTerm.toLowerCase()) 
      // t.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addTeacher(): void {
  this.router.navigate(['/registration/teacher']);
}

  viewDetails(teacher: any): void {
    console.log('View details:', teacher);
  }

  editTeacher(teacher: any): void {
    console.log('Edit:', teacher);
  }

  deleteTeacher(teacher: any): void {
    if (confirm(`Delete ${teacher.firstName} ${teacher.lastName}?`)) {
      this.teacherService.deleteTeacher(teacher.id).subscribe({
        next: () => this.loadTeachers(),
        error: (error) => console.error('Delete error', error)
      });
    }
  }
}