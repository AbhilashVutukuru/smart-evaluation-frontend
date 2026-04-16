import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NonTeachingStaffService } from '../../../core/services/non-teaching-staff.service';


@Component({
  selector: 'app-non-teaching-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './non-teaching-registration.component.html',
  styleUrls: ['./non-teaching-registration.component.css'],
})
export class NonTeachingRegistrationComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private staffService = inject(NonTeachingStaffService);
  private toast        = inject(ToastService);
  private errorHandler = inject(ErrorHandlerService);
  private router       = inject(Router);

  staffForm!: FormGroup;
  loading = false;
  today = new Date().toISOString().split('T')[0];
  touchedFields = new Set<string>();

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    this.staffForm = this.fb.group({
      firstName:     ['', [Validators.required, Validators.maxLength(100)]],
      lastName:      ['', [Validators.required, Validators.maxLength(100)]],
      email:         ['', [Validators.required, Validators.email]],
      phoneNumber:   ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      address:       ['', Validators.required],
      dateOfBirth:   ['', Validators.required],
      gender:        ['', Validators.required],
      department:    ['', Validators.required],
      designation:   ['', Validators.required],
      dateOfJoining: ['', Validators.required],
    });
  }

  onFieldBlur(field: string): void {
    this.touchedFields.add(field);
  }

  shouldShowError(field: string): boolean {
    return this.touchedFields.has(field) && !!this.staffForm.get(field)?.invalid;
  }

  getErrorMessage(field: string): string {
    const errors = this.staffForm.get(field)?.errors;
    if (!errors) return '';
    if (errors['required'])   return 'This field is required';
    if (errors['email'])      return 'Please enter a valid email';
    if (errors['pattern'])    return 'Please enter a valid 10-digit phone number';
    if (errors['maxlength'])  return `Maximum ${errors['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.staffForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
  }

  onSubmit(): void {
    // Mark all fields touched
    Object.keys(this.staffForm.controls).forEach(f => this.touchedFields.add(f));
    if (this.staffForm.invalid) return;

    this.loading = true;
    this.staffService.register(this.staffForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.toast.showSuccess('Success', 'Staff registered successfully');
        this.resetForm();
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle('Failed to register staff', err);
      },
    });
  }

  resetForm(): void {
    this.staffForm.reset();
    this.touchedFields.clear();
  }
}