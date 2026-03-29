import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

interface UploadResults {
  success: number;
  failed:  number;
  total:   number;
  errors?: string[];
}

@Component({
  selector: 'app-teacher-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teacher-registration.component.html',
  styleUrls: ['./teacher-registration.component.css'],
})
export class TeacherRegistrationComponent implements OnInit {
  private fb                  = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  private toastService        = inject(ToastService);
  private errorHandler        = inject(ErrorHandlerService);

  // State
  isDownloading  = false;
  loading        = false;
  uploadProgress = false;
  showBulkUpload = false;

  // Form
  teacherForm!: FormGroup;

  // File upload
  selectedFile:  File | null          = null;
  uploadResults: UploadResults | null = null;

  // Validation tracking
  touchedFields: Set<string> = new Set();

  // Today's date for [max] on date inputs (YYYY-MM-DD)
  today: string = new Date().toISOString().split('T')[0];

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.initForm();
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
      qualification: ['', Validators.required],
      experience:    [0, [Validators.required, Validators.min(0)]],
      dateOfJoining:   ['', Validators.required],
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

    if (control.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (control.errors['email'])    return 'Please enter a valid email address';
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
      qualification: 'Qualification',
      experience:    'Experience',
      dateOfJoining:   'Joining Date',
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
    this.teacherForm.get('experience')?.setValue(parseInt(input.value) || 0, { emitEvent: false });
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

    this.registrationService.registerTeacher(this.teacherForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.toastService.showSuccess('Success', 'Teacher registered successfully!');
          this.resetForm();
        } else {
          this.toastService.showError('Error', response.message || 'Registration failed');
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorHandler.handle('Failed to register teacher', error);
      },
    });
  }

  resetForm(): void {
    this.teacherForm.reset({ experience: 0 });
    this.touchedFields.clear();
  }

  // ============================================
  // Bulk Upload
  // ============================================

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      this.toastService.showWarning('Invalid File', 'Please select an Excel file (.xlsx or .xls)');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toastService.showWarning('File Too Large', 'Maximum file size is 5MB');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    this.selectedFile  = file;
    this.uploadResults = null;
  }

  removeFile(): void {
    this.selectedFile = null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  uploadBulk(): void {
    if (!this.selectedFile) {
      this.toastService.showWarning('File Required', 'Please select a file to upload');
      return;
    }

    this.uploadProgress = true;
    this.uploadResults  = null;

    this.registrationService.bulkUploadTeachers(this.selectedFile).subscribe({
      next: (response) => {
        this.uploadProgress = false;

        if (response.success) {
          this.uploadResults = {
            success: response.successfulRecords || 0,
            failed:  response.failedRecords     || 0,
            total:   response.totalRecords      || 0,
            errors:  response.errors            || [],
          };

          this.toastService.showSuccess('Upload Complete', `${response.successfulRecords} teachers uploaded successfully`);

          if (response.failedRecords > 0) {
            this.toastService.showWarning('Partial Upload', `${response.failedRecords} records failed. Check errors below.`);
          }

          this.removeFile();
        } else {
          this.toastService.showError('Upload Failed', response.message || 'Failed to upload teachers');
        }
      },
      error: (error) => {
        this.uploadProgress = false;
        this.errorHandler.handle('Failed to upload teachers', error);
      },
    });
  }

  // ============================================
  // Template Download
  // ============================================

  downloadTemplate(): void {
    this.isDownloading = true;

    this.registrationService.downloadTemplate('teacher').subscribe({
      next: (blob: Blob) => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'TeacherUploadTemplate.xlsx';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);

        this.isDownloading = false;
        this.toastService.showSuccess('Success', 'Template downloaded successfully');
      },
      error: (error) => {
        this.isDownloading = false;
        this.errorHandler.handle('Failed to download template', error);
      },
    });
  }
}