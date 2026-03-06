import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-student-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './student-view-edit.component.html',
  styleUrls: ['./student-view-edit.component.css']
})
export class StudentViewEditComponent implements OnInit {
  private fb                = inject(FormBuilder);
  private route             = inject(ActivatedRoute);
  private router            = inject(Router);
  private studentService    = inject(StudentService);
  private masterDataService = inject(MasterDataService);
  private toastService      = inject(ToastService);
  private errorHandler      = inject(ErrorHandlerService);

  // Form and Data
  studentForm!: FormGroup;
  studentId!:   number;
  mode: 'view' | 'edit' = 'view';
  loading = false;

  // Dropdown data
  classes:  ClassDto[]   = [];
  sections: SectionDto[] = [];

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
    this.loadClasses();

    this.studentId = +this.route.snapshot.params['id'];
    if (!this.studentId) {
      this.toastService.showError('Error', 'Invalid student ID');
      this.goBack();
      return;
    }

    this.mode = this.route.snapshot.data['mode'] || 'view';

    if (this.mode === 'view') {
      this.studentForm.disable();
    }

    this.loadStudent();
  }

  // ============================================
  // Form Initialization
  // ============================================

  private initForm(): void {
    this.studentForm = this.fb.group({
      firstName:     ['', Validators.required],
      lastName:      ['', Validators.required],
      email:         ['', [Validators.required, Validators.email]],
      phoneNumber:   ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address:       ['', Validators.required],
      dateOfBirth:   ['', Validators.required],
      gender:        ['', Validators.required],
      classId:       ['', Validators.required],
      sectionId:     ['', Validators.required],
      rollNumber:    ['', Validators.required],
      admissionDate: ['', Validators.required],
    });

    this.studentForm.get('classId')?.valueChanges.subscribe((classId) => {
      if (classId) this.loadSections(+classId);
    });
  }

  // ============================================
  // Field Validation
  // ============================================

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
    const control = this.studentForm.get(fieldName);
    if (control) {
      control.markAsTouched();
      control.updateValueAndValidity();
    }
  }

  shouldShowError(fieldName: string): boolean {
    const control = this.studentForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || this.touchedFields.has(fieldName)));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.studentForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (control.errors['email'])    return 'Please enter a valid email address';
    if (control.errors['pattern'] && fieldName === 'phoneNumber') return 'Phone number must be exactly 10 digits';

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
      classId:       'Class',
      sectionId:     'Section',
      rollNumber:    'Roll Number',
      admissionDate: 'Admission Date',
    };
    return labels[fieldName] || fieldName;
  }

  // ============================================
  // Input Handlers
  // ============================================

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.studentForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
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
    if (!classId) return;
    this.masterDataService.getSectionsByClass(classId).subscribe({
      next: (sections) => (this.sections = sections),
      error: (error)   => this.errorHandler.handle('Failed to load sections', error),
    });
  }

  private loadStudent(): void {
    this.loading = true;

    this.studentService.getStudentById(this.studentId).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success && response.data) {
          const s = response.data;
          this.studentForm.patchValue({
            firstName:     s.firstName,
            lastName:      s.lastName,
            email:         s.email,
            phoneNumber:   s.phoneNumber,
            address:       s.address,
            dateOfBirth:   s.dateOfBirth?.split('T')[0],
            gender:        s.gender,
            classId:       s.classId,
            sectionId:     s.sectionId,
            rollNumber:    s.rollNumber,
            admissionDate: s.admissionDate?.split('T')[0],
          });

          if (s.classId) this.loadSections(s.classId);
        } else {
          this.toastService.showError('Error', 'Student not found');
          this.goBack();
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to load student details', error);
        setTimeout(() => this.goBack(), 2000);
      },
    });
  }

  // ============================================
  // Mode Management
  // ============================================

  enableEdit(): void {
    this.mode = 'edit';
    this.studentForm.enable();
    this.toastService.showInfo('Edit Mode', 'You can now edit student details');
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
    this.showCancelModal = false;
  }

  onCancelCancelled(): void {
    this.showCancelModal = false;
  }

  private performCancel(): void {
    if (this.mode === 'edit') {
      this.mode = 'view';
      this.studentForm.disable();
      this.touchedFields.clear();
      this.loadStudent();
      this.toastService.showInfo('Cancelled', 'Changes discarded');
    } else {
      this.goBack();
    }
  }

  // ============================================
  // Form Submission
  // ============================================

  onSubmit(): void {
    Object.keys(this.studentForm.controls).forEach((key) => {
      this.touchedFields.add(key);
      this.studentForm.get(key)?.markAsTouched();
    });

    if (this.studentForm.invalid) {
      this.toastService.showWarning('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    this.loading = true;

    const payload = { id: this.studentId, ...this.studentForm.value };

    this.studentService.updateStudent(payload).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Student updated successfully!');
          this.mode = 'view';
          this.studentForm.disable();
          this.touchedFields.clear();
          this.loadStudent();
        } else {
          this.toastService.showError('Error', response.message || 'Failed to update student');
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to update student', error);
      },
    });
  }

  // ============================================
  // Delete Operations
  // ============================================

  deleteStudent(): void {
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.studentId) {
      this.toastService.showError('Error', 'Invalid student ID');
      this.showDeleteModal = false;
      return;
    }

    this.studentService.deleteStudent(this.studentId).subscribe({
      next: (response) => {
        this.showDeleteModal = false;

        if (response.success) {
          this.toastService.showSuccess('Success', 'Student deleted successfully!');
          setTimeout(() => this.router.navigate(['/students/list']), 1500);
        } else {
          this.toastService.showError('Error', response.message || 'Failed to delete student');
        }
      },
      error: (error) => {
        this.showDeleteModal = false;
        this.errorHandler.handle('Failed to delete student', error);
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
    this.router.navigate(['/students/list']);
  }

  getStudentFullName(): string {
    const first = this.studentForm.get('firstName')?.value || '';
    const last  = this.studentForm.get('lastName')?.value  || '';
    return `${first} ${last}`.trim();
  }

  getStudentInfo(): string {
    const fullName   = this.getStudentFullName();
    const rollNumber = this.studentForm.get('rollNumber')?.value || '';
    return rollNumber ? `${fullName} (Roll: ${rollNumber})` : fullName;
  }
}