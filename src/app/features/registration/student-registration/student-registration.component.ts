import { Component, DestroyRef, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators,
  ReactiveFormsModule, FormsModule,
} from '@angular/forms';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService }        from '../../../core/services/toast.service';
import { ClassDto, MasterDataService, SectionDto } from '../../../core/services/master-data.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

interface RowError {
  rowNumber:   number;
  studentName: string;
  columns:     string[];
}

interface UploadResults {
  success:   number;
  failed:    number;
  total:     number;
  rowErrors: RowError[];
}

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class StudentRegistrationComponent implements OnInit {
  private fb                  = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  private toastService        = inject(ToastService);
  private masterDataService   = inject(MasterDataService);
  private errorHandler        = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  isDownloading  = false;
  loading        = false;
  uploadProgress = false;

  studentForm!:  FormGroup;
  showBulkUpload = false;
  bulkClassId:   number | null = null;
  bulkSectionId: number | null = null;

  classes:  ClassDto[]   = [];
  sections: SectionDto[] = [];

  selectedFile:  File | null          = null;
  uploadResults: UploadResults | null = null;

  touchedFields: Set<string> = new Set();

  todayDate = new Date().toISOString().split('T')[0];

  // ─── Error grouping ───────────────────────────────────────

  private groupErrors(rawErrors: any[]): RowError[] {
    const map = new Map<number, RowError>();

    rawErrors.forEach((e: any) => {
      let rowNumber = 0, studentName = '', message = '';

      if (typeof e === 'string') {
        try {
          const parsed = JSON.parse(e);
          rowNumber   = parsed.rowNumber ?? 0;
          studentName = parsed.studentName ?? '';
          message     = parsed.error ?? parsed.errorMessage ?? parsed.message ?? e;
        } catch {
          const match = e.match(/^Row (\d+):\s*(.+)$/);
          if (match) { rowNumber = +match[1]; message = match[2]; }
          else { message = e; }
        }
      } else {
        rowNumber   = e.rowNumber ?? 0;
        studentName = e.studentName ?? '';
        message     = e.error ?? e.errorMessage ?? e.message ?? '';
      }

      message = message.replace(/^Row \d+:\s*/, '');
      if (!map.has(rowNumber)) map.set(rowNumber, { rowNumber, studentName, columns: [] });
      map.get(rowNumber)!.columns.push(message);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.rowNumber === 0 ? 1 : b.rowNumber === 0 ? -1 : a.rowNumber - b.rowNumber
    );
  }

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.initForm();
    this.loadClasses();
    this.setupFormListeners();
  }


  // ─── Form ─────────────────────────────────────────────────

  private initForm(): void {
    this.studentForm = this.fb.group({
      firstName:     ['', Validators.required],
      lastName:      ['', Validators.required],
      dateOfBirth:   ['', Validators.required],
      gender:        ['', Validators.required],
      phoneNumber:   ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address:       ['', Validators.required],
      classId:       ['', Validators.required],
      sectionId:     [{ value: '', disabled: true }, Validators.required],
      rollNumber:    [{ value: '', disabled: true }, Validators.required],
      admissionDate: ['', Validators.required],
    });
  }

  private setupFormListeners(): void {
      this.studentForm.get('classId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((classId) => this.onClassChangeHandler(classId));

    this.studentForm.get('sectionId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sectionId) => this.onSectionChangeHandler(sectionId));
  }

  private onClassChangeHandler(classId: string): void {
    const sectionControl = this.studentForm.get('sectionId');
    const rollControl    = this.studentForm.get('rollNumber');
    if (classId) {
      sectionControl?.enable();
      this.loadSections(+classId);
    } else {
      sectionControl?.disable(); sectionControl?.reset();
      rollControl?.disable();    rollControl?.reset();
      this.sections = [];
    }
  }

  private onSectionChangeHandler(sectionId: string): void {
    const rollControl = this.studentForm.get('rollNumber');
    if (sectionId) { rollControl?.enable(); this.loadNextRollNumber(); }
    else           { rollControl?.disable(); rollControl?.reset(); }
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
      firstName: 'First Name', lastName: 'Last Name', dateOfBirth: 'Date of Birth',
      gender: 'Gender', email: 'Email', phoneNumber: 'Phone Number', address: 'Address',
      classId: 'Class', sectionId: 'Section', rollNumber: 'Roll Number', admissionDate: 'Admission Date',
    };
    return labels[fieldName] || fieldName;
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    this.studentForm.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
  }

  get isClassSelected(): boolean { return !!this.studentForm.get('classId')?.value; }

  // ─── Load Data ────────────────────────────────────────────

  private loadClasses(): void {
    this.masterDataService.getClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (classes) => (this.classes = classes),
        error: (error)   => this.errorHandler.handle('Failed to load classes', error),
      });
  }

  private loadSections(classId: number): void {
    this.masterDataService.getSectionsByClass(classId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (sections) => (this.sections = sections),
        error: (error)    => this.errorHandler.handle('Failed to load sections', error),
      });
  }

  private loadNextRollNumber(): void {
    const classId   = this.studentForm.get('classId')?.value;
    const sectionId = this.studentForm.get('sectionId')?.value;
    const rollControl = this.studentForm.get('rollNumber');
    if (!classId || !sectionId) { rollControl?.reset(); return; }

    this.registrationService.getNextRollNumber(classId, sectionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) rollControl?.setValue(response.data.nextRollNumber);
          else rollControl?.reset();
        },
        error: (error) => {
          this.errorHandler.handle('Failed to load roll number', error);
          rollControl?.reset();
        },
      });
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

    this.registrationService.registerStudent(this.studentForm.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.toastService.showSuccess('Success', 'Student registered successfully!');
            this.resetForm();
          } else {
            // FIX: never show raw response.message to user
            this.toastService.showError('Error', 'Registration failed. Please try again.');
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorHandler.handle('Registration failed', error);
        },
      });
  }

  resetForm(): void {
    this.studentForm.reset();
    this.touchedFields.clear();
    this.sections = [];
  }

  // ─── Bulk Upload ──────────────────────────────────────────

  onBulkClassChange(): void {
    this.bulkSectionId = null;
    this.sections      = [];
    if (this.bulkClassId) this.loadSections(this.bulkClassId);
    if (this.selectedFile) this.removeFile();
  }

  canSelectFile(): boolean { return !!(this.bulkClassId && this.bulkSectionId); }
  canUpload():     boolean { return !!(this.bulkClassId && this.bulkSectionId && this.selectedFile); }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!this.canSelectFile()) {
      this.toastService.showWarning('Selection Required', 'Please select Class and Section first');
      (event.target as HTMLInputElement).value = ''; return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      this.toastService.showWarning('Invalid File', 'Please select an Excel file (.xlsx or .xls)');
      (event.target as HTMLInputElement).value = ''; return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toastService.showWarning('File Too Large', 'Maximum file size is 5MB');
      (event.target as HTMLInputElement).value = ''; return;
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
    if (!this.canUpload()) {
      this.toastService.showWarning('Required Fields', 'Please select class, section, and file'); return;
    }

    this.uploadProgress = true;
    this.uploadResults  = null;

    this.registrationService
      .bulkUploadStudents(this.selectedFile!, this.bulkClassId!, this.bulkSectionId!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.uploadProgress = false;
          const data      = raw?.data ?? raw;
          const success   = data?.successCount      ?? data?.successfulRecords ?? 0;
          const failed    = data?.failedCount       ?? data?.failedRecords     ?? 0;
          const total     = data?.totalRows         ?? data?.totalRecords      ?? (success + failed);
          const rowErrors = this.groupErrors(data?.errors ?? []);

          this.uploadResults = { success, failed, total, rowErrors };

          if (success > 0) this.toastService.showSuccess('Upload Complete', `${success} of ${total} students registered successfully`);
          if (failed > 0)  this.toastService.showWarning('Validation Errors', `${failed} row(s) failed — see error details below`);
          if (success === 0 && failed === 0) this.toastService.showError('Upload Failed', 'No records were processed');

          this.removeFile();
        },
        error: (error) => {
          this.uploadProgress = false;
          const body      = error?.error;
          const data      = body?.data ?? body;
          const rowErrors = this.groupErrors(data?.errors ?? []);
          const failed    = data?.failedCount  ?? data?.failedRecords  ?? rowErrors.length;
          const total     = data?.totalRows    ?? data?.totalRecords   ?? failed;
          const success   = data?.successCount ?? data?.successfulRecords ?? 0;

          if (rowErrors.length > 0) {
            this.uploadResults = { success, failed, total, rowErrors };
            this.toastService.showWarning('Validation Errors', `${failed} row(s) failed — see error details below`);
            return;
          }

          // FIX: only use body.message for upload-specific validation messages; otherwise generic
          const msg = body?.message ?? 'Upload failed. Please try again.';
          this.toastService.showError('Upload Failed', msg);
        },
      });
  }

  // ─── Template Download ────────────────────────────────────

  downloadTemplate(): void {
    this.isDownloading = true;

    this.registrationService.downloadTemplate('student')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob) => {
          const url  = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = 'StudentUploadTemplate.xlsx';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
          this.isDownloading = false;
          this.toastService.showSuccess('Success', 'Template downloaded successfully');
        },
        error: (error) => {
          this.isDownloading = false;
          this.errorHandler.handle('Failed to download template', error);
        },
      });
  }

  // ─── Helpers ──────────────────────────────────────────────

  getClassName(classId: number | null): string {
    if (!classId) return '';
    return this.classes.find((c) => c.id === classId)?.className ?? '';
  }

  getSectionName(sectionId: number | null): string {
    if (!sectionId) return '';
    return this.sections.find((s) => s.id === sectionId)?.sectionName ?? '';
  }
}