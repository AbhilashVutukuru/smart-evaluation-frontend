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

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.css'],
})
export class StudentRegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private registrationService = inject(RegistrationService);

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
    this.registrationService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.classes = response.data;
        }
      },
      error: (error) => console.error('Error loading classes', error),
    });
  }

  loadSections(classId: number): void {
    this.studentForm.patchValue({ sectionId: '' });
    this.registrationService.getSections(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sections = response.data;
        }
      },
      error: (error) => console.error('Error loading sections', error),
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

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    this
  }

  onBulkClassChange(): void {
    this.bulkSectionId = null;
    if (this.bulkClassId) {
      this.loadSections(this.bulkClassId);
    }
  }

  uploadBulk(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file';
      return;
    }
 if (!this.bulkClassId || !this.bulkSectionId) {
    this.error = 'Please select class and section first';
    return;
  }

    this.uploadProgress = true;
    this.error = '';
    this.success = '';

   
    this.registrationService
      .bulkUploadStudents(this.selectedFile, this.bulkClassId, this.bulkSectionId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.success = `Successfully uploaded ${response.successfulRecords} of ${response.totalRecords} students`;
            if (response.failedRecords > 0) {
              this.error = `Failed: ${response.failedRecords} records. Errors: ${response.errors?.join(', ')}`;
            }
          } else {
            this.error = response.message;
          }
          this.uploadProgress = false;
          this.selectedFile = null;
        },
        error: (error) => {
          this.error = error.error?.message || 'Upload failed';
          this.uploadProgress = false;
        },
      });
  }
}
