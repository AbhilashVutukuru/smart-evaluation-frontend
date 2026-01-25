import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RegistrationService } from '../../../core/services/registration.service';
import { SubjectDropdown } from '../../../core/models/registration.model';

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

  teacherForm!: FormGroup;
  loading = false;
  error = '';
  success = '';
  showBulkUpload = false;
  
  subjects: SubjectDropdown[] = [];
  selectedFile: File | null = null;
  uploadProgress = false;

  ngOnInit(): void {
    this.initForm();
    this.loadSubjects();
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
      qualification: ['', Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]],
      joiningDate: ['', Validators.required],
      subjectIds: [[], Validators.required]
    });
  }

  loadSubjects(): void {
    this.registrationService.getSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects = response.data;
        }
      },
      error: (error) => console.error('Error loading subjects', error)
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

  onSubmit(): void {
    if (this.teacherForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.registrationService.registerTeacher(this.teacherForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Teacher registered successfully!';
          this.teacherForm.reset();
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Registration failed';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  uploadBulk(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file';
      return;
    }

    this.uploadProgress = true;
    this.error = '';
    this.success = '';

    this.registrationService.bulkUploadTeachers(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = `Successfully uploaded ${response.successfulRecords} of ${response.totalRecords} teachers`;
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
      }
    });
  }
}
