import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private registrationService = inject(RegistrationService);
   private router = inject(Router);

  students: any[] = [];
  filteredStudents: any[] = [];
  loading = false;
  searchTerm = '';
  selectedClass = '';
  selectedSection = '';
  
  classes: any[] = [];
  sections: any[] = [];


  ngOnInit(): void {
    //this.loadStudents();

    this.loadClasses();
    //this.loadStudents();
  }

   loadClasses(): void {
    this.registrationService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.classes = response.data;
        }
      },
      error: (error) => console.error('Error loading classes', error)
    });
  }

  onClassChange(): void {
     this.selectedSection = '';
  this.sections = [];
  this.students = [];
  this.filteredStudents = [];
    if (this.selectedClass) {
      this.registrationService.getSections(+this.selectedClass).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.sections = response.data;
          }
        },
        error: (error) => console.error('Error loading sections', error)
      });
    }
   //this.loadStudents();
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
    this.filteredStudents = this.students.filter(s => 
      s.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      s.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) 
      // s.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addStudent(): void {
    this.router.navigate(['/registration/student']);
  }

 
  viewDetails(student: any): void {
    // Navigate to details or show modal
    console.log('View details:', student);
  }

  editStudent(student: any): void {
    // Navigate to edit
    console.log('Edit:', student);
  }

  deleteStudent(student: any): void {
    if (confirm(`Delete ${student.firstName} ${student.lastName}?`)) {
      this.studentService.deleteStudent(student.id).subscribe({
        next: () => this.loadStudents(),
        error: (error) => console.error('Delete error', error)
      });
    }
  }
}