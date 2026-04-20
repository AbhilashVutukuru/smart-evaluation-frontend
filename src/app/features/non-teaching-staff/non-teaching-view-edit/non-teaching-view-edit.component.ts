import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NonTeachingStaffService } from '../../../core/services/non-teaching-staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-non-teaching-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './non-teaching-view-edit.component.html',
  styleUrls: ['./non-teaching-view-edit.component.css'],
})
export class NonTeachingViewEditComponent extends BaseComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private staffService = inject(NonTeachingStaffService);
  private toast        = inject(ToastService);
  private errorHandler = inject(ErrorHandlerService);

  staffForm!: FormGroup;
  mode: 'view' | 'edit' = 'view';
  loading   = false;
  deleting  = false;
  showDeleteModal = false;
  showCancelModal = false;
  touchedFields   = new Set<string>();
  today = new Date().toISOString().split('T')[0];

  private staffId!: number;
  private originalValues: any = {};

  ngOnInit(): void {
    this.staffId = Number(this.route.snapshot.paramMap.get('id'));
    this.mode    = (this.route.snapshot.data['mode'] as 'view' | 'edit') ?? 'view';
    this.buildForm();
    this.loadStaff();
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
      employeeCode:  [{ value: '', disabled: true }],
      department:    ['', Validators.required],
      designation:   ['', Validators.required],
      dateOfJoining: ['', Validators.required],
    });
    this.setFormMode();
  }

  private setFormMode(): void {
    if (this.mode === 'view') {
      this.staffForm.disable();
    } else {
      this.staffForm.enable();
      this.staffForm.get('employeeCode')?.disable();
    }
  }

  private loadStaff(): void {
    this.loading = true;
    this.staffService.getById(this.staffId).pipe(this.cancelOnDestroy()).subscribe({
      next: (data) => {
        this.loading = false;
        const values = {
          firstName:     data.firstName,
          lastName:      data.lastName,
          email:         data.email,
          phoneNumber:   data.phoneNumber,
          address:       data.address,
          dateOfBirth:   data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          gender:        data.gender,
          employeeCode:  data.employeeCode,
          department:    data.department,
          designation:   data.designation,
          dateOfJoining: data.dateOfJoining ? data.dateOfJoining.split('T')[0] : '',
        };
        this.staffForm.patchValue(values);
        this.originalValues = values;
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle('Failed to load staff details', err);
        this.goBack();
      },
    });
  }

  enableEdit(): void {
    this.mode = 'edit';
    this.staffForm.enable();
    this.staffForm.get('employeeCode')?.disable();
  }

  cancelEdit(): void {
    const isDirty = JSON.stringify(this.staffForm.getRawValue()) !==
                    JSON.stringify({ ...this.originalValues, employeeCode: this.staffForm.get('employeeCode')?.value });
    if (isDirty) {
      this.showCancelModal = true;
    } else {
      this.revertToView();
    }
  }

  onCancelConfirmed(): void {
    this.showCancelModal = false;
    this.revertToView();
  }

  onCancelCancelled(): void {
    this.showCancelModal = false;
  }

  private revertToView(): void {
    this.mode = 'view';
    this.staffForm.patchValue(this.originalValues);
    this.staffForm.disable();
    this.touchedFields.clear();
  }

  onSubmit(): void {
    Object.keys(this.staffForm.controls).forEach(f => this.touchedFields.add(f));
    if (this.staffForm.invalid) return;

    this.loading = true;
    this.staffService.update(this.staffId, this.staffForm.getRawValue()).pipe(this.cancelOnDestroy()).subscribe({
      next: () => {
        this.loading = false;
        this.toast.showSuccess('Success', 'Staff updated successfully');
        this.originalValues = { ...this.staffForm.getRawValue() };
        this.mode = 'view';
        this.staffForm.disable();
        this.touchedFields.clear();
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle('Failed to update staff', err);
      },
    });
  }

  deleteStaff(): void {
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    this.deleting = true;
    this.staffService.delete(this.staffId).pipe(this.cancelOnDestroy()).subscribe({
      next: () => {
        this.deleting        = false;
        this.showDeleteModal = false;
        this.toast.showSuccess('Success', 'Staff deleted successfully');
        this.router.navigate(['/non-teaching-staff/list']);
      },
      error: (err) => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.errorHandler.handle('Failed to delete staff', err);
      },
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.deleting        = false;
  }

  goBack(): void {
    this.router.navigate(['/non-teaching-staff/list']);
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
    if (errors['required'])  return 'This field is required';
    if (errors['email'])     return 'Please enter a valid email';
    if (errors['pattern'])   return 'Please enter a valid 10-digit phone number';
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.staffForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
  }

  getStaffInfo(): string {
    const f = this.staffForm.getRawValue();
    return `${f.firstName} ${f.lastName}`;
  }
}