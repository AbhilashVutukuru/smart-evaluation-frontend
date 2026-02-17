import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-student-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './student-view-edit.component.html',
  styleUrls: ['./student-view-edit.component.css']
})
export class StudentViewEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentService = inject(StudentService);
  private registrationService = inject(RegistrationService);
   private masterDataService = inject(MasterDataService);
      private toastService = inject(ToastService);

  studentForm!: FormGroup;
  studentId!: number;
  mode: 'view' | 'edit' = 'view';
  loading = false;
  error = '';
  success = '';

 classes: ClassDto[] = [];
    sections: SectionDto[] = [];

  // Delete Modal
  showDeleteModal = false;
  studentToDelete: any = null;

  // Cancel Modal
  showCancelModal = false;

  ngOnInit(): void {
    this.initForm();
    this.loadClasses();
    
    this.studentId = +this.route.snapshot.params['id'];
    this.mode = this.route.snapshot.data['mode'] || 'view';
    
    if (this.mode === 'view') {
      this.studentForm.disable();
    }
    
    this.loadStudent();
  }

  initForm(): void {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      classId: ['', Validators.required],
      sectionId: ['', Validators.required],
      rollNumber: ['', Validators.required],
      admissionDate: ['', Validators.required],
      // guardianName: ['', Validators.required],
      // guardianPhone: ['', Validators.required],
      // guardianRelation: ['', Validators.required]
    });

    this.studentForm.get('classId')?.valueChanges.subscribe(classId => {
      if (classId) {
        this.loadSections(+classId);
      }
    });
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
onClassChange(event: Event): void {
  const selectedValue = (event.target as HTMLSelectElement).value;

  const classId = Number(selectedValue);  // convert to number
  this.loadSections(classId);
}

  loadSections(classId: number): void {
   this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => {
        this.sections = sections;
      },
      error: (error) => {
        this.toastService.showError('Error', 'Failed to load sections');
      },
    });
  }  

  loadStudent(): void {
    this.loading = true;
    this.studentService.getStudentById(this.studentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const student = response.data;
          this.studentForm.patchValue({
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phoneNumber: student.phoneNumber,
            address: student.address,
            dateOfBirth: student.dateOfBirth?.split('T')[0],
            gender: student.gender,
            classId: student.classId,
            sectionId: student.sectionId,
            rollNumber: student.rollNumber,
            admissionDate:student.admissionDate?.split('T')[0]
            // guardianName: student.guardianName,
            // guardianPhone: student.guardianPhone,
            // guardianRelation: student.guardianRelation
          });
          
          if (student.classId) {
            this.loadSections(student.classId);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load student';
        this.loading = false;
      }
    });
  }

  enableEdit(): void {
    this.mode = 'edit';
    this.studentForm.enable();
  }

   cancelEdit(): void {
    if (this.studentForm.dirty) {
      this.showCancelModal = true;
    } else {
      this.performCancel();
    }
  }

  onCancelConfirmed(): void {
    this.performCancel();
  }

  onCancelCancelled(): void {
    this.showCancelModal = false;
  }

  performCancel(): void {
    this.showCancelModal = false;
    if (this.mode === 'edit') {
      this.mode = 'view';
      this.studentForm.disable();
      this.loadStudent(); // Reload original data
    } else {
      this.goBack();
    }
  }

  deleteStudent(): void {
     //this.studentToDelete = student;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (this.studentId) {
      this.studentService.deleteStudent(this.studentId).subscribe({
        next: () => {
          this.success = 'Student deleted successfully!';
          setTimeout(() => {
            this.router.navigate(['//students/list']);
          }, 1500);
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to delete student';
          this.showDeleteModal = false;
        }
      });
    }
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
  }

  onSubmit(): void {
    if (this.studentForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      id: this.studentId,
      ...this.studentForm.value
    };

    this.studentService.updateStudent(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Student updated successfully!';
          this.mode = 'view';
          this.studentForm.disable();
          setTimeout(() => this.success = '', 3000);
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to update student';
        this.loading = false;
      }
    });
  }

  // deleteStudent(): void {
  //   if (!confirm('Are you sure you want to delete this student?')) return;

  //   this.loading = true;
  //   this.studentService.deleteStudent(this.studentId).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.success = 'Student deleted successfully!';
  //         setTimeout(() => this.router.navigate(['/students/list']), 2000);
  //       }
  //       this.loading = false;
  //     },
  //     error: (error) => {
  //       this.error = error.error?.message || 'Failed to delete student';
  //       this.loading = false;
  //     }
  //   });
  // }

  goBack(): void {
    this.router.navigate(['/students/list']);
  }

  getStudentFullName(): string {
    if (!this.studentToDelete) return '';
    return `${this.studentToDelete.firstName} ${this.studentToDelete.lastName}`;
  }

  getStudentInfo(): string {
    if (!this.studentToDelete) return '';
    return `${this.studentToDelete.firstName} ${this.studentToDelete.lastName} (Roll: ${this.studentToDelete.rollNumber})`;
  }
}