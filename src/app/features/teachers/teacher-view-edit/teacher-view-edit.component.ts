import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../../core/services/teacher.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-teacher-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './teacher-view-edit.component.html',
  styleUrls: ['./teacher-view-edit.component.css']
})
export class TeacherViewEditComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private teacherService = inject(TeacherService);
  private toastService   = inject(ToastService);
  private errorHandler   = inject(ErrorHandlerService);

  // Form and Data
  teacherForm!: FormGroup;
  teacherId!: number;
  mode: 'view' | 'edit' = 'view';
  loading = false;

  // Today's date in YYYY-MM-DD — bound to [max] on date inputs
  // so the calendar disables tomorrow and all future dates
  today: string = new Date().toISOString().split('T')[0];

  // Modals
  showDeleteModal = false;
  showCancelModal = false;

  // Validation tracking
  touchedFields: Set<string> = new Set();

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.initForm();

    this.teacherId = +this.route.snapshot.params['id'];
    if (!this.teacherId) {
      this.toastService.showError('Error', 'Invalid teacher ID');
      this.goBack();
      return;
    }

    this.mode = this.route.snapshot.data['mode'] || 'view';

    if (this.mode === 'view') {
      this.teacherForm.disable();
    }

    this.loadTeacher();
  }

  // ============================================
  // Form Initialization
  // ============================================

  private initForm(): void {
    this.teacherForm = this.fb.group({
      firstName:     ['', Validators.required],
      lastName:      ['', Validators.required],
      email:         ['', [Validators.required, Validators.email]],
      phoneNumber:   ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address:       ['', Validators.required],
      dateOfBirth:   ['', Validators.required],
      gender:        ['', Validators.required],
      employeeCode:  ['', Validators.required],
      qualification: ['', Validators.required],
      experience:    [0, [Validators.required, Validators.min(0)]],
      dateOfJoining: ['', Validators.required],
    });
  }

  // ============================================
  // Field Validation
  // ============================================

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
    const control = this.teacherForm.get(fieldName);
    if (control) {
      control.markAsTouched();
      control.updateValueAndValidity();
    }
  }

  shouldShowError(fieldName: string): boolean {
    const control = this.teacherForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || this.touchedFields.has(fieldName)));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.teacherForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required'])  return `${this.getFieldLabel(fieldName)} is required`;
    if (control.errors['email'])     return 'Please enter a valid email address';
    if (control.errors['pattern'] && fieldName === 'phoneNumber') return 'Phone number must be exactly 10 digits';
    if (control.errors['min']     && fieldName === 'experience')  return 'Experience cannot be negative';

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName:     'First Name',
      lastName:      'Last Name',
      email:         'Email',
      phoneNumber:   'Phone Number',
      address:       'Address',
      dateOfBirth:   'Date of Birth',
      gender:        'Gender',
      employeeCode:  'Employee Code',
      qualification: 'Qualification',
      experience:    'Experience',
      dateOfJoining: 'Joining Date',
    };
    return labels[fieldName] || fieldName;
  }

  // ============================================
  // Input Handlers
  // ============================================

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.teacherForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
  }

  onExperienceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    const value = parseInt(input.value) || 0;
    this.teacherForm.get('experience')?.setValue(value, { emitEvent: false });
  }

  // ============================================
  // Load Data
  // ============================================

  private loadTeacher(): void {
    this.loading = true;

    this.teacherService.getTeacherById(this.teacherId).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success && response.data) {
          const t = response.data;
          this.teacherForm.patchValue({
            firstName:     t.firstName,
            lastName:      t.lastName,
            email:         t.email,
            phoneNumber:   t.phoneNumber,
            address:       t.address,
            dateOfBirth:   t.dateOfBirth?.split('T')[0],
            gender:        t.gender,
            employeeCode:  t.employeeCode,
            qualification: t.qualification,
            experience:    t.experience,
            dateOfJoining: t.dateOfJoining?.split('T')[0],
          });
        } else {
          this.toastService.showError('Error', 'Teacher not found');
          this.goBack();
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to load teacher details', error);
        setTimeout(() => this.goBack(), 2000);
      },
    });
  }

  // ============================================
  // Mode Management
  // ============================================

  enableEdit(): void {
    this.mode = 'edit';
    this.teacherForm.enable();
    this.teacherForm.get('employeeCode')?.disable();
    this.toastService.showInfo('Edit Mode', 'You can now edit teacher details');
  }

  cancelEdit(): void {
    if (this.teacherForm.dirty) {
      this.showCancelModal = true;
    } else {
      this.performCancel();
    }
  }

  onCancelConfirmed(): void {
    this.performCancel();
    this.showCancelModal = false;
  }

  onCancelCancelled(): void {
    this.showCancelModal = false;
  }

  private performCancel(): void {
    if (this.mode === 'edit') {
      this.mode = 'view';
      this.teacherForm.disable();
      this.touchedFields.clear();
      this.loadTeacher();
      this.toastService.showInfo('Cancelled', 'Changes discarded');
    } else {
      this.goBack();
    }
  }

  // ============================================
  // Form Submission
  // ============================================

  onSubmit(): void {
    Object.keys(this.teacherForm.controls).forEach((key) => {
      this.touchedFields.add(key);
      this.teacherForm.get(key)?.markAsTouched();
    });

    if (this.teacherForm.invalid) {
      this.toastService.showWarning('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    this.loading = true;

    const payload = { id: this.teacherId, ...this.teacherForm.value };

    this.teacherService.updateTeacher(payload).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Teacher updated successfully!');
          this.mode = 'view';
          this.teacherForm.disable();
          this.touchedFields.clear();
          this.loadTeacher();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to update teacher');
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to update teacher', error);
      },
    });
  }

  // ============================================
  // Delete Operations
  // ============================================

  deleteTeacher(): void {
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.teacherId) {
      this.toastService.showError('Error', 'Invalid teacher ID');
      this.showDeleteModal = false;
      return;
    }

    this.teacherService.deleteTeacher(this.teacherId).subscribe({
      next: (response) => {
        this.showDeleteModal = false;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Teacher deleted successfully!');
          setTimeout(() => this.router.navigate(['/teachers/list']), 1500);
        } else {
          this.toastService.showError('Error', response.message || 'Failed to delete teacher');
        }
      },
      error: (error) => {
        this.showDeleteModal = false;
        this.errorHandler.handle('Failed to delete teacher', error);
      },
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
  }

  // ============================================
  // Navigation & Helpers
  // ============================================

  goBack(): void {
    this.router.navigate(['/teachers/list']);
  }

  getTeacherFullName(): string {
    const first = this.teacherForm.get('firstName')?.value || '';
    const last  = this.teacherForm.get('lastName')?.value  || '';
    return `${first} ${last}`.trim();
  }

  getTeacherInfo(): string {
    const fullName     = this.getTeacherFullName();
    const employeeCode = this.teacherForm.get('employeeCode')?.value || '';
    return employeeCode ? `${fullName} (${employeeCode})` : fullName;
  }
}