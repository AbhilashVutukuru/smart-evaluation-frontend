import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

interface UploadResults {
  success: number;
  failed: number;
  total: number;
  errors?: string[];
}

@Component({
  selector: 'app-teacher-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teacher-registration.component.html',
  styleUrls: ['./teacher-registration.component.css']
})
export class TeacherRegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  private toastService = inject(ToastService);

  // State
  isDownloading = false;
  loading = false;
  uploadProgress = false;
  showBulkUpload = false;

  // Form
  teacherForm!: FormGroup;

  // File upload
  selectedFile: File | null = null;
  uploadResults: UploadResults | null = null;

  // ✅ Validation tracking
  touchedFields: Set<string> = new Set();

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
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      qualification: ['', Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]],
      joiningDate: ['', Validators.required]
    });
  }

  // ============================================
  // ✅ Field Validation on Blur
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

    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }
    
    if (control.errors['pattern'] && fieldName === 'phoneNumber') {
      return 'Phone number must be exactly 10 digits';
    }

    if (control.errors['min'] && fieldName === 'experience') {
      return 'Experience cannot be negative';
    }
    
    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      qualification: 'Qualification',
      experience: 'Experience',
      joiningDate: 'Joining Date'
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
  // Form Submission
  // ============================================

  onSubmit(): void {
    // Mark all fields as touched
    Object.keys(this.teacherForm.controls).forEach(key => {
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
        this.handleError('Failed to register teacher', error);
      }
    });
  }

   resetForm(): void {
    this.teacherForm.reset({
      experience: 0
    });
    this.touchedFields.clear();
  }

  // ============================================
  // Bulk Upload Methods
  // ============================================

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // File type validation
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      this.toastService.showWarning('Invalid File', 'Please select an Excel file (.xlsx or .xls)');
      event.target.value = '';
      return;
    }

    // File size validation (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.showWarning('File Too Large', 'Maximum file size is 5MB');
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
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
    this.uploadResults = null;

    this.registrationService.bulkUploadTeachers(this.selectedFile).subscribe({
      next: (response) => {
        this.uploadProgress = false;

        if (response.success) {
          this.uploadResults = {
            success: response.successfulRecords || 0,
            failed: response.failedRecords || 0,
            total: response.totalRecords || 0,
            errors: response.errors || []
          };

          this.toastService.showSuccess(
            'Upload Complete',
            `${response.successfulRecords} teachers uploaded successfully`
          );

          if (response.failedRecords > 0) {
            this.toastService.showWarning(
              'Partial Upload',
              `${response.failedRecords} records failed. Check errors below.`
            );
          }

          this.removeFile();
        } else {
          this.toastService.showError('Upload Failed', response.message || 'Failed to upload teachers');
        }
      },
      error: (error) => {
        this.uploadProgress = false;
        this.handleError('Failed to upload teachers', error);
      }
    });
  }

  // ============================================
  // Template Download
  // ============================================

  downloadTemplate(): void {
    this.isDownloading = true;

    this.registrationService.downloadTemplate('teacher').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
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
        this.handleError('Failed to download template', error);
      }
    });
  }

  // ============================================
  // ✅ Centralized Error Handling
  // ============================================

  private handleError(userMessage: string, error: any): void {
    const errorMessage = this.extractErrorMessage(error);

    if (!this.isProduction()) {
      console.error('Error Details:', {
        userMessage,
        error,
        errorMessage
      });
    }

    this.toastService.showError('Error', errorMessage || userMessage);
  }

  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (typeof error?.error === 'string') {
      return error.error;
    }
    
    if (error?.statusText) {
      return error.statusText;
    }
    
    return '';
  }

  private isProduction(): boolean {
    return false; // Change based on environment
  }
}