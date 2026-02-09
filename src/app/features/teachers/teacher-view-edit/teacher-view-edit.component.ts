import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../../core/services/teacher.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';

@Component({
  selector: 'app-teacher-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './teacher-view-edit.component.html',
  styleUrls: ['./teacher-view-edit.component.css']
})
export class TeacherViewEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teacherService = inject(TeacherService);
  private registrationService = inject(RegistrationService);

  teacherForm!: FormGroup;
  teacherId!: number;
  mode: 'view' | 'edit' = 'view';
  loading = false;
  error = '';
  success = '';

  classes: any[] = [];
  subjects: any[] = [];

  // Add properties
showDeleteModal = false;
showCancelModal = false;
teacherToDelete: any = null;

  ngOnInit(): void {
    this.initForm();
    this.loadClasses();
    
    this.teacherId = +this.route.snapshot.params['id'];
    this.mode = this.route.snapshot.data['mode'] || 'view';
    
    if (this.mode === 'view') {
      this.teacherForm.disable();
    }
    
    this.loadTeacher();
  }

  initForm(): void {
    this.teacherForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      employeeCode: ['', Validators.required],
      qualification: ['', Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]],
      dateOfJoining: ['', Validators.required],
      //classId: ['', Validators.required],
      //subjectIds: [[], Validators.required]
    });

    this.teacherForm.get('classId')?.valueChanges.subscribe(classId => {
      if (classId) {
        this.loadSubjects(+classId);
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

  loadSubjects(classId: number): void {
    this.registrationService.getSubjects(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects = response.data.map((s: any) => ({
            ...s,
            selected: false
          }));
        }
      }
    });
  }

  loadTeacher(): void {
    this.loading = true;
    this.teacherService.getTeacherById(this.teacherId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const teacher = response.data;
          this.teacherForm.patchValue({
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email,
            phoneNumber: teacher.phoneNumber,
            address: teacher.address,
            dateOfBirth: teacher.dateOfBirth?.split('T')[0],
            gender: teacher.gender,
            employeeCode: teacher.employeeCode,
            qualification: teacher.qualification,
            experience: teacher.experience,
            dateOfJoining: teacher.dateOfJoining?.split('T')[0],
            //classId: teacher.classId,
            //subjectIds: teacher.subjectIds || []
          });
          
          if (teacher.classId) {
            this.loadSubjects(teacher.classId);
            setTimeout(() => {
              this.subjects.forEach(s => {
                s.selected = teacher.subjectIds?.includes(s.id);
              });
            }, 500);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load teacher';
        this.loading = false;
      }
    });
  }

  onSubjectChange(event: any, subjectId: number): void {
    const currentSubjects = this.teacherForm.get('subjectIds')?.value || [];
    if (event.target.checked) {
      this.teacherForm.patchValue({ subjectIds: [...currentSubjects, subjectId] });
    } else {
      this.teacherForm.patchValue({ 
        subjectIds: currentSubjects.filter((id: number) => id !== subjectId) 
      });
    }
  }

  enableEdit(): void {
    this.mode = 'edit';
    this.teacherForm.enable();
  }

  // Update cancelEdit method:
cancelEdit(): void {
  if (this.teacherForm.dirty) {
    this.showCancelModal = true;
  } else {
    this.performCancel();
  }
}

// Add new methods:
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
    this.teacherForm.disable();
    this.loadTeacher();
  } else {
    this.goBack();
  }
}

  onSubmit(): void {
    if (this.teacherForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      id: this.teacherId,
      ...this.teacherForm.value
    };

    this.teacherService.updateTeacher(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Teacher updated successfully!';
          this.mode = 'view';
          this.teacherForm.disable();
          setTimeout(() => this.success = '', 3000);
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to update teacher';
        this.loading = false;
      }
    });
  }
deleteTeacher(): void {
  this.showDeleteModal = true;
}

onDeleteConfirmed(): void {
  if (this.teacherToDelete) {
    this.teacherService.deleteTeacher(this.teacherToDelete.id).subscribe({
      next: () => {
        this.success = 'Teacher deleted successfully!';
        setTimeout(() => this.router.navigate(['/teachers']), 1500);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to delete teacher';
        this.showDeleteModal = false;
      }
    });
  }
}

onDeleteCancelled(): void {
  this.showDeleteModal = false;
}

getTeacherFullName(): string {
  if (!this.teacherToDelete) return '';
  return `${this.teacherToDelete.firstName} ${this.teacherToDelete.lastName}`;
}
  // deleteTeacher(): void {
  //   if (!confirm('Are you sure you want to delete this teacher?')) return;

  //   this.loading = true;
  //   this.teacherService.deleteTeacher(this.teacherId).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.success = 'Teacher deleted successfully!';
  //         setTimeout(() => this.router.navigate(['/teachers/list']), 2000);
  //       }
  //       this.loading = false;
  //     },
  //     error: (error) => {
  //       this.error = error.error?.message || 'Failed to delete teacher';
  //       this.loading = false;
  //     }
  //   });
  // }

  goBack(): void {
    this.router.navigate(['/teachers/list']);
  }
}