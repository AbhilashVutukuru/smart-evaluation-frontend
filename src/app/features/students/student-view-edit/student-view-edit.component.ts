import { Component, DestroyRef, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService }     from '../../../core/services/student.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { CancelConfirmationComponent } from '../../../shared/components/cancel-confirmation/cancel-confirmation.component';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ToastService }       from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-student-view-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationComponent, CancelConfirmationComponent],
  templateUrl: './student-view-edit.component.html',
  styleUrls: ['./student-view-edit.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class StudentViewEditComponent extends BaseComponent implements OnInit {
  private fb                  = inject(FormBuilder);
  private route               = inject(ActivatedRoute);
  private router              = inject(Router);
  private studentService      = inject(StudentService);
  private masterDataService   = inject(MasterDataService);
  private toastService        = inject(ToastService);
  private errorHandler        = inject(ErrorHandlerService);
  private registrationService = inject(RegistrationService);


  studentForm!: FormGroup;
  studentId!:   number;
  mode: 'view' | 'edit' = 'view';
  loading = false;

  today: string = new Date().toISOString().split('T')[0];

  classes:  ClassDto[]   = [];
  sections: SectionDto[] = [];

  showDeleteModal = false;
  showCancelModal = false;

  // TRUE when the student has uploaded answer sheets — identity fields are locked.
  // Locked fields: firstName, lastName, classId, sectionId, rollNumber.
  // Reason: these fields are referenced by blob paths and DB records (StudentAnswerSheet).
  hasAnswerSheets = false;

  // The 5 identity fields that must not be editable when hasAnswerSheets = true
  private readonly LOCKED_FIELDS = ['firstName', 'lastName', 'classId', 'sectionId', 'rollNumber'] as const;

  touchedFields: Set<string> = new Set();

  private _initializing = false;

  // ─── Lifecycle ────────────────────────────────────────────

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
    if (this.mode === 'view') this.studentForm.disable();

    this.loadStudent();
  }


  // ─── Form ─────────────────────────────────────────────────

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

    this.studentForm.get('classId')?.valueChanges
      .pipe(this.cancelOnDestroy())
      .subscribe((classId) => {
        if (!this._initializing) {
          this.sections = [];
          this.studentForm.get('sectionId')?.setValue('', { emitEvent: false });
          this.studentForm.get('rollNumber')?.setValue('', { emitEvent: false });
          if (classId) this.loadSections(+classId);
        }
      });

    this.studentForm.get('sectionId')?.valueChanges
      .pipe(this.cancelOnDestroy())
      .subscribe((sectionId) => {
        const classId = this.studentForm.get('classId')?.value;
        if (!this._initializing && this.mode === 'edit') {
          if (sectionId && classId) this.loadNextRollNumber(+classId, +sectionId);
          else this.studentForm.get('rollNumber')?.setValue('', { emitEvent: false });
        }
      });
  }

  // ─── Validation ───────────────────────────────────────────

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
    const control = this.studentForm.get(fieldName);
    if (control) { control.markAsTouched(); control.updateValueAndValidity(); }
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
      firstName: 'First Name', lastName: 'Last Name', email: 'Email',
      phoneNumber: 'Phone Number', address: 'Address', dateOfBirth: 'Date of Birth',
      gender: 'Gender', classId: 'Class', sectionId: 'Section',
      rollNumber: 'Roll Number', admissionDate: 'Admission Date',
    };
    return labels[fieldName] || fieldName;
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.studentForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
  }

  // ─── Load Data ────────────────────────────────────────────

  private loadClasses(): void {
    this.masterDataService.getClasses()
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next:  (classes) => (this.classes = classes),
        error: (error)   => this.errorHandler.handle('Failed to load classes', error),
      });
  }

  private loadSections(classId: number): void {
    if (!classId) return;
    this.masterDataService.getSectionsByClass(classId)
   .pipe(this.cancelOnDestroy())
      .subscribe({
        next:  (sections) => (this.sections = sections),
        error: (error)    => this.errorHandler.handle('Failed to load sections', error),
      });
  }

  // ─── Identity lock helper ─────────────────────────────────
  // Call this every time the form is enabled in edit mode.
  // Disables the 5 identity fields when hasAnswerSheets is true.
  private applyIdentityLocks(): void {
    if (!this.hasAnswerSheets) return;
    this.LOCKED_FIELDS.forEach(f =>
      this.studentForm.get(f)?.disable({ emitEvent: false })
    );
  }

  private loadSectionsAndPatchSection(classId: number, sectionId: number | string): void {
    if (!classId) return;
    this.masterDataService.getSectionsByClass(classId)
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (sections) => {
          this.sections = sections;
          if (!sectionId) return;
          const ctrl = this.studentForm.get('sectionId');
          if (!ctrl) return;
          this._initializing = true;
          // Only temporarily enable if NOT a locked field in edit mode
          const isLocked = this.mode === 'edit' && this.hasAnswerSheets;
          const wasDisabled = ctrl.disabled;
          if (wasDisabled && !isLocked) ctrl.enable({ emitEvent: false });
          ctrl.setValue(+sectionId, { emitEvent: false });
          // Re-disable if it was disabled (view mode) OR if it's locked
          if (wasDisabled || isLocked) ctrl.disable({ emitEvent: false });
          this._initializing = false;
          // Re-apply all locks after async patch — HTTP response arrives after enableEdit
          this.applyIdentityLocks();
        },
        error: (error) => this.errorHandler.handle('Failed to load sections', error),
      });
  }

  private loadNextRollNumber(classId: number, sectionId: number): void {
    if (!classId || !sectionId) return;
    this.registrationService.getNextRollNumber(classId, sectionId)
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response: any) => {
          const rollNumber = response?.data?.nextRollNumber;
          if (rollNumber !== null && rollNumber !== undefined) {
            this.studentForm.get('rollNumber')?.setValue(rollNumber, { emitEvent: false });
          }
        },
        error: () => { /* silently ignore — roll number is auto-suggested, not critical */ },
      });
  }

  private loadStudent(): void {
    this.loading = true;
    this.studentService.getStudentById(this.studentId)
     .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            const s = response.data;
            this._initializing = true;
            this.studentForm.patchValue({
              firstName: s.firstName, lastName: s.lastName, email: s.email,
              phoneNumber: s.phoneNumber, address: s.address,
              dateOfBirth: s.dateOfBirth?.split('T')[0], gender: s.gender,
              classId: s.classId, sectionId: s.sectionId,
              rollNumber: s.rollNumber, admissionDate: s.admissionDate?.split('T')[0],
            });
            this._initializing = false;
            this.hasAnswerSheets = !!s.hasAnswerSheets;
            if (s.classId) this.loadSectionsAndPatchSection(s.classId, s.sectionId);
          } else {
            this.toastService.showError('Error', 'Student not found');
            this.goBack();
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorHandler.handle('Failed to load student details', error);
                  this.timer(() => this.goBack(), 2000);
        },
      });
  }

  // ─── Mode Management ──────────────────────────────────────

  enableEdit(): void {
    this.mode = 'edit';
    this._initializing = true;
    this.studentForm.enable();
    this._initializing = false;

    // Apply locks immediately before any async call
    this.applyIdentityLocks();

    const classId   = this.studentForm.get('classId')?.value;
    const sectionId = this.studentForm.get('sectionId')?.value;
    // loadSectionsAndPatchSection also calls applyIdentityLocks() after HTTP resolves
    if (classId) this.loadSectionsAndPatchSection(+classId, sectionId ?? '');

    this.toastService.showInfo('Edit Mode', 'You can now edit student details');
  }

  cancelEdit(): void {
    if (this.studentForm.dirty) this.showCancelModal = true;
    else this.performCancel();
  }

  onCancelConfirmed(): void { this.performCancel(); this.showCancelModal = false; }
  onCancelCancelled(): void { this.showCancelModal = false; }

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

  // ─── Submit ───────────────────────────────────────────────

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
    // form.value already excludes disabled controls — locked fields are safe.
    // Spread only the editable fields; never send locked identity values.
    const payload = { id: this.studentId, ...this.studentForm.value };

    this.studentService.updateStudent(payload)
    .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.toastService.showSuccess('Success', 'Student updated successfully!');
            this.mode = 'view';
            this.studentForm.disable();
            this.touchedFields.clear();
            this.loadStudent();
          } else {
            // FIX: never show raw response.message — use generic message
            this.toastService.showError('Error', 'Failed to update student. Please try again.');
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorHandler.handle('Failed to update student', error);
        },
      });
  }

  // ─── Delete ───────────────────────────────────────────────

  deleteStudent(): void { this.showDeleteModal = true; }

  onDeleteConfirmed(): void {
    if (!this.studentId) {
      this.toastService.showError('Error', 'Invalid student ID');
      this.showDeleteModal = false;
      return;
    }

    this.studentService.deleteStudent(this.studentId)
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response) => {
          this.showDeleteModal = false;
          if (response.success) {
            this.toastService.showSuccess('Success', 'Student deleted successfully!');
            const qp = this.route.snapshot.queryParams;
            // FIX: stored timer
            this.timer(() => this.router.navigate(['/students/list'], {
              queryParams: qp['classId'] && qp['sectionId']
                ? { classId: qp['classId'], sectionId: qp['sectionId'] } : {}
            }), 1500);
          } else {
            this.toastService.showError('Error', 'Failed to delete student. Please try again.');
          }
        },
        error: (error) => {
          this.showDeleteModal = false;
          this.errorHandler.handle('Failed to delete student', error);
        },
      });
  }

  onDeleteCancelled(): void { this.showDeleteModal = false; }

  // ─── Navigation ───────────────────────────────────────────

  goBack(): void {
    const qp = this.route.snapshot.queryParams;
    this.router.navigate(['/students/list'], {
      queryParams: qp['classId'] && qp['sectionId']
        ? { classId: qp['classId'], sectionId: qp['sectionId'] } : {}
    });
  }

  getStudentFullName(): string {
    const first = this.studentForm.get('firstName')?.value || '';
    const last  = this.studentForm.get('lastName')?.value  || '';
    return `${first} ${last}`.trim();
  }

  getStudentInfo(): string {
    const fullName   = this.getStudentFullName();
    const rollNumber = this.studentForm.get('rollNumber')?.value || '';
    const classId    = this.studentForm.get('classId')?.value;
    const sectionId  = this.studentForm.get('sectionId')?.value;
    const className   = this.classes.find(c  => String(c.id) === String(classId))?.className   || '';
    const sectionName = this.sections.find(s => String(s.id) === String(sectionId))?.sectionName || '';
    const parts = [fullName];
    if (className)   parts.push(`Class: ${className}`);
    if (sectionName) parts.push(`Section: ${sectionName}`);
    if (rollNumber)  parts.push(`Roll: ${rollNumber}`);
    return parts.join(' | ');
  }
}