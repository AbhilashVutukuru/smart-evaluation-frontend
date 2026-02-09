import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RegistrationService } from '../../../core/services/registration.service';
import {
  ClassDropdown,
  SectionDropdown,
} from '../../../core/models/registration.model';
import { ToastService } from '../../../shared/services/toast.service';

interface UploadResults {
  success: number;
  failed: number;
  total: number;
  errors?: string[];
}

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.css'],
})
export class StudentRegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  private toastService = inject(ToastService);

  isDownloading = false;
  isLoadingClasses = false;
  isLoadingSections = false;

  studentForm!: FormGroup;
  loading = false;
  error = '';
  success = '';
  showBulkUpload = false;
  bulkClassId: number | null = null;
  bulkSectionId: number | null = null;

  classes: ClassDropdown[] = [];
  sections: SectionDropdown[] = [];
  selectedFile: File | null = null;
  uploadProgress = false;
  uploadResults: UploadResults | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadClasses();
    // Auto-fetch roll number when class and section are selected
    this.studentForm.get('sectionId')?.valueChanges.subscribe((sectionId) => {
      if (sectionId && this.studentForm.get('classId')?.value) {
        this.loadNextRollNumber();
      }
    });
  }

  initForm(): void {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      classId: ['', Validators.required],
      sectionId: ['', Validators.required],
      rollNumber: ['', Validators.required],
      admissionDate: ['', Validators.required],
    });

    this.studentForm.get('classId')?.valueChanges.subscribe((classId) => {
      if (classId) {
        this.loadSections(classId);
      }
    });
  }

  loadNextRollNumber(): void {
    const classId = this.studentForm.get('classId')?.value;
    const sectionId = this.studentForm.get('sectionId')?.value;

    if (classId && sectionId) {
      this.registrationService.getNextRollNumber(classId, sectionId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.studentForm.patchValue({
              rollNumber: response.data.nextRollNumber,
            });
          }
        },
        error: (error) => console.error('Error loading roll number', error),
      });
    }
  }

  loadClasses(): void {
    this.isLoadingClasses = true;
    this.registrationService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.classes = response.data;
        }
        this.isLoadingClasses = false;
      },
      error: (error) => {
        console.error('Error loading classes', error);
        this.isLoadingClasses = false;
        this.toastService.showError('Error', 'Failed to load classes');
      },
    });
  }

  loadSections(classId: number): void {
    this.isLoadingSections = true;
    this.registrationService.getSections(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sections = response.data;
        }
        this.isLoadingSections = false;
      },
      error: (error) => {
        console.error('Error loading sections', error);
        this.isLoadingSections = false;
        this.toastService.showError('Error', 'Failed to load sections');
      },
    });
  }

  onSubmit(): void {
    if (this.studentForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.registrationService.registerStudent(this.studentForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Student registered successfully!';
          this.studentForm.reset();
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Registration failed';
        this.loading = false;
      },
    });
  }

  // ✅✅✅ BULK UPLOAD METHODS - UPDATED WITH VALIDATION ✅✅✅

  onBulkClassChange(): void {
    this.bulkSectionId = null;
    this.sections = [];
    
    if (this.bulkClassId) {
      this.loadSections(this.bulkClassId);
    }
    
    // Clear selected file when class changes
    if (this.selectedFile) {
      this.removeFile();
    }
  }

  // ✅ NEW: Check if user can select file (class and section must be selected)
  canSelectFile(): boolean {
    return !!(this.bulkClassId && this.bulkSectionId);
  }

  // ✅ NEW: Check if user can upload (class, section, and file must be selected)
  canUpload(): boolean {
    return !!(this.bulkClassId && this.bulkSectionId && this.selectedFile);
  }

  // ✅ NEW: Get validation message for upload button
  getValidationMessage(): string {
    if (!this.bulkClassId) return 'Please select a class';
    if (!this.bulkSectionId) return 'Please select a section';
    if (!this.selectedFile) return 'Please select a file';
    return '';
  }

  // ✅ MODIFIED: Validate class/section before accepting file
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // ✅ ADD: Validate class and section first
    if (!this.bulkClassId || !this.bulkSectionId) {
      this.toastService.showWarning(
        'Selection Required',
        'Please select Class and Section first'
      );
      event.target.value = '';
      return;
    }

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
    this.uploadResults = null; // Clear previous results
  }

  removeFile(): void {
    this.selectedFile = null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // Enhanced validation before upload
  uploadBulk(): void {
    // Double-check all requirements
    if (!this.canUpload()) {
      this.toastService.showWarning(
        'Required Fields',
        'Please select class, section, and file'
      );
      return;
    }

    this.uploadProgress = true;
    this.error = '';
    this.success = '';
    this.uploadResults = null;

    this.registrationService
      .bulkUploadStudents(
        this.selectedFile!,
        this.bulkClassId!,
        this.bulkSectionId!,
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.uploadResults = {
              success: response.successfulRecords || 0,
              failed: response.failedRecords || 0,
              total: response.totalRecords || 0,
              errors: response.errors || [],
            };

            this.success = `Successfully uploaded ${response.successfulRecords} of ${response.totalRecords} students`;

            if (response.failedRecords > 0) {
              this.error = `${response.failedRecords} records failed to upload. Check errors below.`;
            }

            // Clear file after successful upload
            this.selectedFile = null;
            const fileInput = document.getElementById('fileInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            this.toastService.showSuccess(
              'Upload Complete',
              `${response.successfulRecords} students uploaded successfully`
            );
          } else {
            this.error = response.message;
            this.toastService.showError('Upload Failed', response.message);
          }
          this.uploadProgress = false;
        },
        error: (error) => {
          this.error = error.error?.message || 'Upload failed';
          this.uploadProgress = false;
          this.toastService.showError('Error', this.error);
        },
      });
  }

  getClassName(classId: number | null): string {
  if (!classId) return '';
  const cls = this.classes.find(c => c.id === classId);
  return cls ? cls.className : '';
}

getSectionName(sectionId: number | null): string {
  if (!sectionId) return '';
  const section = this.sections.find(s => s.id === sectionId);
  return section ? section.sectionName : '';
}

  downloadTemplate(): void {
    this.isDownloading = true;

    this.registrationService.downloadTemplate('student').subscribe({
      next: (blob: Blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'StudentUploadTemplate.xlsx';

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.isDownloading = false;
        this.toastService.showSuccess(
          'Success',
          'Template downloaded successfully',
        );
      },
      error: (error) => {
        this.isDownloading = false;
        console.error('Download error:', error);
        this.toastService.showError('Error', 'Failed to download template');
      },
    });
  }
}