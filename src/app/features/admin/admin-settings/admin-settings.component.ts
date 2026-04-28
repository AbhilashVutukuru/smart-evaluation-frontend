import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators,
  ReactiveFormsModule, FormsModule,
} from '@angular/forms';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService }      from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
})
export class AdminSettingsComponent implements OnInit {
  private fb                = inject(FormBuilder);
  private svc               = inject(AdminSettingsService);
  private masterDataService = inject(MasterDataService);
  private toastService      = inject(ToastService);
  private errorHandler      = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  // ── Tab state ──────────────────────────────────────────────
  mainTab:   'master' | 'assign' | 'academic' | 'admin'                     = 'master';
  masterTab: 'class' | 'section' | 'subject' | 'examtype'                   = 'class';
  assignTab: 'assign-section' | 'assign-subject' | 'assign-examtype'        = 'assign-section';

  // ── Master data lists ──────────────────────────────────────
  classes:         any[] = [];
  masterSections:  any[] = [];
  masterSubjects:  any[] = [];
  masterExamTypes: any[] = [];

  // ── Assignment lists ───────────────────────────────────────
  assignedSections:  any[] = [];
  assignedSubjects:  any[] = [];
  assignedExamTypes: any[] = [];

  // ── Academic Year & Admin ──────────────────────────────────
  academicYears: any[] = [];
  users:         any[] = [];
  admins:        any[] = [];

  sectionsForAssignSubject:   any[] = [];
  sectionsForAssignExamType:  any[] = [];

  // ── Forms ──────────────────────────────────────────────────
  classForm!:           FormGroup;
  sectionForm!:         FormGroup;
  subjectForm!:         FormGroup;
  examTypeForm!:        FormGroup;
  assignSectionForm!:   FormGroup;
  assignSubjectForm!:   FormGroup;
  assignExamTypeForm!:  FormGroup;
  academicYearForm!:    FormGroup;
  promoteStudentsForm!: FormGroup;
  adminAssignForm!:     FormGroup;

  get today():       string { return new Date().toISOString().split('T')[0]; }
  get currentYear(): number { return new Date().getFullYear(); }

  // ── UI state ───────────────────────────────────────────────
  loading  = false;
  deleting = false;

  // ── Filters ───────────────────────────────────────────────
  classFilter          = '';
  sectionFilter        = '';
  subjectFilter        = '';
  examTypeFilter       = '';
  assignSectionFilter  = '';
  assignSubjectFilter  = '';
  assignExamTypeFilter = '';
  academicYearFilter   = '';
  adminFilter          = '';

  // ── Delete modal ──────────────────────────────────────────
  showDeleteModal    = false;
  deleteModalTitle   = '';
  deleteModalMessage = '';
  deleteItemName     = '';
  deleteType         = '';
  itemToDelete: any  = null;

  showRemoveAdminModal = false;
  adminToRemove: any   = null;

  // FIX: promote confirmation modal — replaces browser confirm()
  // confirm() blocks the UI thread, is unstyled, and can't be tested.
  showPromoteModal    = false;
  promoteModalMessage = '';
  private _pendingPromotePayload: { fromYearId: number; toYearId: number } | null = null;

  // ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForms();
    this.loadAll();
  }


  // ── Form initialisation ───────────────────────────────────
  initForms(): void {
    this.classForm     = this.fb.group({ classNumber: ['', [Validators.required, Validators.pattern(/^(1[0-2]|[1-9])$/)]] });
    this.sectionForm   = this.fb.group({ sectionName: ['', [Validators.required, Validators.pattern(/^[A-Z]$/)]] });
    this.subjectForm   = this.fb.group({ subjectName: ['', Validators.required] });
    this.examTypeForm  = this.fb.group({ examTypeName: ['', Validators.required] });

    this.assignSectionForm  = this.fb.group({ classId: ['', Validators.required], sectionId: [{value: '', disabled: true}, Validators.required] });
    this.assignSubjectForm  = this.fb.group({ classId: ['', Validators.required], subjectId: [{value: '', disabled: true}, Validators.required] });
    this.assignExamTypeForm = this.fb.group({ classId: ['', Validators.required], examTypeId: [{value: '', disabled: true}, Validators.required] });

    // Enable second dropdown only after class is selected
    this.assignSectionForm.get('classId')?.valueChanges.subscribe(v => {
      const ctrl = this.assignSectionForm.get('sectionId');
      v ? ctrl?.enable() : ctrl?.disable();
    });
    this.assignSubjectForm.get('classId')?.valueChanges.subscribe(v => {
      const ctrl = this.assignSubjectForm.get('subjectId');
      v ? ctrl?.enable() : ctrl?.disable();
    });
    this.assignExamTypeForm.get('classId')?.valueChanges.subscribe(v => {
      const ctrl = this.assignExamTypeForm.get('examTypeId');
      v ? ctrl?.enable() : ctrl?.disable();
    });

    this.academicYearForm = this.fb.group(
      {
        yearName:  ['', [Validators.required, this.academicYearNameValidator()]],
        startDate: ['', Validators.required],
        endDate:   ['', Validators.required],
      },
      { validators: this.academicYearDatesValidator() }
    );

      this.academicYearForm.get('yearName')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.academicYearForm.get('startDate')?.updateValueAndValidity({ emitEvent: false });
        this.academicYearForm.get('endDate')?.updateValueAndValidity({ emitEvent: false });
      });

    this.promoteStudentsForm = this.fb.group({ fromYearId: ['', Validators.required], toYearId: ['', Validators.required] });
    this.adminAssignForm     = this.fb.group({ userId: ['', Validators.required] });
  }

  // ── Load all data ─────────────────────────────────────────
  loadAll(): void {
    this.loadClasses(); 
    this.loadMasterSections(); 
    this.loadMasterSubjects();
    this.loadMasterExamTypes();
    this.loadAssignedSections();
    this.loadAssignedSubjects();
    this.loadAssignedExamTypes();
    this.loadAcademicYears(); 
    this.loadUsers();
    this.loadAdmins();
  }

  loadClasses():          void { 
    this.svc.getClasses().
    pipe(takeUntilDestroyed(this.destroyRef)).
    subscribe({ 
      next: (r) => { 
        if (r.success) this.classes = r.data ?? []; 
      } }); }
  loadMasterSections():   void { 
    this.svc.getMasterSections()
    .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
       next: (r) => {
         if (r.success) this.masterSections = r.data ?? [];
         } }); }
  loadMasterSubjects():   void {
    this.svc.getMasterSubjects()
    .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ 
      next: (r) => { 
        if (r.success) this.masterSubjects = r.data ?? []; 
      } }); }
  loadMasterExamTypes():  void { 
    this.svc.getMasterExamTypes()
    .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ 
      next: (r) => { 
        if (r.success) this.masterExamTypes = r.data ?? []; 
      } }); }
  loadAssignedSections(): void { 
    this.svc.getAssignedSections()
    .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
       next: (r) => { 
        if (r.success) this.assignedSections = r.data ?? []; 
      } }); }
  loadAssignedSubjects(): void { this.svc.getAssignedSubjects().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { if (r.success) this.assignedSubjects = r.data ?? []; } }); }
  loadAssignedExamTypes():void { this.svc.getAssignedExamTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { if (r.success) this.assignedExamTypes = r.data ?? []; } }); }
  loadAcademicYears():    void { this.svc.getAcademicYears().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { if (r.success) this.academicYears = r.data ?? []; } }); }
  loadUsers():            void { this.svc.getUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { if (r.success) this.users = r.data ?? []; } }); }
  loadAdmins():           void { this.svc.getAdmins().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { if (r.success) this.admins = r.data ?? []; } }); }

  // ── Dynamic sections for assignment forms ─────────────────
  onAssignSubjectClassChange(event: any): void {
    const classId = +event.target.value;
    this.assignSubjectForm.patchValue({ sectionId: '' });
    this.sectionsForAssignSubject = [];
    if (!classId) return;
    this.svc.getSectionsByClass(classId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { if (r.success) this.sectionsForAssignSubject = r.data ?? []; } });
  }

  onAssignExamTypeClassChange(event: any): void {
    const classId = +event.target.value;
    this.assignExamTypeForm.patchValue({ sectionId: '' });
    this.sectionsForAssignExamType = [];
    if (!classId) return;
    this.svc.getSectionsByClass(classId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { if (r.success) this.sectionsForAssignExamType = r.data ?? []; } });
  }

  // ── Tab navigation ────────────────────────────────────────
  setMainTab(tab: 'master' | 'assign' | 'academic' | 'admin'):                         void { this.mainTab = tab; }
  setMasterTab(tab: 'class' | 'section' | 'subject' | 'examtype'):                     void { this.masterTab = tab; }
  setAssignTab(tab: 'assign-section' | 'assign-subject' | 'assign-examtype'):           void { this.assignTab = tab; }

  // ══════════ MASTER DATA CREATE ══════════
  createClass(): void {
    if (this.classForm.invalid) return;
    this.loading = true;
    this.svc.createClass(this.classForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Class created successfully!'); this.classForm.reset(); this.loadClasses(); } else { this.toastService.showError('Error', r.message ?? 'Failed to create class'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to create class', e); this.loading = false; },
    });
  }

  createSection(): void {
    if (this.sectionForm.invalid) return;
    this.loading = true;
    this.svc.createMasterSection(this.sectionForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Section created successfully!'); this.sectionForm.reset(); this.loadMasterSections(); } else { this.toastService.showError('Error', r.message ?? 'Failed to create section'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to create section', e); this.loading = false; },
    });
  }

  createSubject(): void {
    if (this.subjectForm.invalid) return;
    this.loading = true;
    this.svc.createMasterSubject(this.subjectForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Subject created successfully!'); this.subjectForm.reset(); this.loadMasterSubjects(); } else { this.toastService.showError('Error', r.message ?? 'Failed to create subject'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to create subject', e); this.loading = false; },
    });
  }

  createExamType(): void {
    if (this.examTypeForm.invalid) return;
    this.loading = true;
    this.svc.createMasterExamType(this.examTypeForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Exam type created successfully!'); this.examTypeForm.reset(); this.loadMasterExamTypes(); } else { this.toastService.showError('Error', r.message ?? 'Failed to create exam type'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to create exam type', e); this.loading = false; },
    });
  }

  // ══════════ ASSIGNMENTS ══════════
  assignSection(): void {
    if (this.assignSectionForm.invalid) return;
    this.loading = true;
    this.svc.assignSection(this.assignSectionForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Section assigned successfully!'); this.assignSectionForm.reset(); this.loadAssignedSections(); } else { this.toastService.showError('Error', r.message ?? 'Failed to assign section'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to assign section', e); this.loading = false; },
    });
  }

  assignSubject(): void {
    if (this.assignSubjectForm.invalid) return;
    this.loading = true;
    this.svc.assignSubject(this.assignSubjectForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Subject assigned successfully!'); this.assignSubjectForm.reset(); this.loadAssignedSubjects(); } else { this.toastService.showError('Error', r.message ?? 'Failed to assign subject'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to assign subject', e); this.loading = false; },
    });
  }

  assignExamType(): void {
    if (this.assignExamTypeForm.invalid) return;
    this.loading = true;
    this.svc.assignExamType(this.assignExamTypeForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Exam type assigned successfully!'); this.assignExamTypeForm.reset(); this.loadAssignedExamTypes(); } else { this.toastService.showError('Error', r.message ?? 'Failed to assign exam type'); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to assign exam type', e); this.loading = false; },
    });
  }

  // ══════════ DELETE ══════════
  openDeleteModal(type: string, item: any): void {
    this.deleteType   = type;
    this.itemToDelete = item;
    const titles: Record<string, string> = {
      'class': 'Delete Class', 'master-section': 'Delete Section',
      'master-subject': 'Delete Subject', 'master-examtype': 'Delete Exam Type',
      'assigned-section': 'Remove Section Assignment',
      'assigned-subject': 'Remove Subject Assignment',
      'assigned-examtype': 'Remove Exam Type Assignment',
    };
    this.deleteModalTitle   = titles[type] || 'Delete Item';
    this.deleteModalMessage = type.startsWith('assigned')
      ? 'Are you sure you want to remove this assignment?'
      : 'Are you sure you want to delete this item? This action cannot be undone.';
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.itemToDelete) return;
    const id = this.itemToDelete.id;
    this.deleting = true;

    const actions: Record<string, () => void> = {
      'class':            () => this.svc.deleteClass(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Class deleted!'); this.loadClasses(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to delete', e); this.resetDeleteModal(); } }),
      'master-section':   () => this.svc.deleteMasterSection(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Section deleted!'); this.loadMasterSections(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to delete', e); this.resetDeleteModal(); } }),
      'master-subject':   () => this.svc.deleteMasterSubject(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Subject deleted!'); this.loadMasterSubjects(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to delete', e); this.resetDeleteModal(); } }),
      'master-examtype':  () => this.svc.deleteMasterExamType(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Exam type deleted!'); this.loadMasterExamTypes(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to delete', e); this.resetDeleteModal(); } }),
      'assigned-section': () => this.svc.removeAssignedSection(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Assignment removed!'); this.loadAssignedSections(); this.loadMasterSections(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to remove', e); this.resetDeleteModal(); } }),
      'assigned-subject': () => this.svc.removeAssignedSubject(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Assignment removed!'); this.loadAssignedSubjects(); this.loadMasterSubjects(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to remove', e); this.resetDeleteModal(); } }),
      'assigned-examtype':() => this.svc.removeAssignedExamType(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.showSuccess('Assignment removed!'); this.loadAssignedExamTypes(); this.loadMasterExamTypes(); this.resetDeleteModal(); }, error: (e) => { this.errorHandler.handle('Failed to remove', e); this.resetDeleteModal(); } }),
    };

    actions[this.deleteType]?.();
  }

  onDeleteCancelled(): void { this.resetDeleteModal(); }

  resetDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteType      = '';
    this.itemToDelete    = null;
    this.loading         = false;
    this.deleting        = false;
  }

  // ── Filtered getters ──────────────────────────────────────
  get filteredClasses()         { return this.filterList(this.classes,         this.classFilter,          ['classNumber']); }
  get filteredMasterSections()  { return this.filterList(this.masterSections,  this.sectionFilter,        ['sectionName']); }
  get filteredMasterSubjects()  { return this.filterList(this.masterSubjects,  this.subjectFilter,        ['subjectName']); }
  get filteredMasterExamTypes() { return this.filterList(this.masterExamTypes, this.examTypeFilter,       ['examTypeName']); }
  get filteredAssignedSections(){ return this.filterList(this.assignedSections, this.assignSectionFilter, ['classNumber','sectionName']); }
  get filteredAssignedSubjects(){ return this.filterList(this.assignedSubjects, this.assignSubjectFilter, ['classNumber','sectionName','subjectName']); }
  get filteredAssignedExamTypes(){ return this.filterList(this.assignedExamTypes, this.assignExamTypeFilter, ['classNumber','sectionName','examTypeName']); }
  get filteredAcademicYears()   { return this.filterList(this.academicYears,   this.academicYearFilter,   ['yearName']); }

  // ── ACADEMIC YEAR ─────────────────────────────────────────
  createAcademicYear(): void {
    if (this.academicYearForm.invalid) return;
    this.loading = true;
    this.svc.createAcademicYear(this.academicYearForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Academic Year created successfully!'); this.academicYearForm.reset(); this.loadAcademicYears(); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to create academic year', e); this.loading = false; },
    });
  }

  setActiveAcademicYear(id: number): void {
    this.loading = true;
    const selectedYear = this.academicYears.find(y => y.id === id);
    this.svc.setActiveAcademicYear(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Active academic year updated!');
          if (selectedYear) this.masterDataService.updateAcademicYearInstantly(selectedYear.yearName);
          this.loadAcademicYears();
        }
        this.loading = false;
      },
      error: (e) => { this.errorHandler.handle('Failed to set active year', e); this.loading = false; },
    });
  }

  // FIX: replaced browser confirm() with a custom modal.
  // confirm() blocks the JS thread, cannot be styled, and cannot be tested.
  promoteStudents(): void {
    if (this.promoteStudentsForm.invalid) return;
    const fromYearId = +this.promoteStudentsForm.get('fromYearId')?.value;
    const toYearId   = +this.promoteStudentsForm.get('toYearId')?.value;
    const fromYear   = this.academicYears.find(y => y.id === fromYearId);
    const toYear     = this.academicYears.find(y => y.id === toYearId);

    if (fromYear && toYear && new Date(fromYear.startDate) >= new Date(toYear.startDate)) {
      this.toastService.showError('Error',
        `Cannot promote backward. "${toYear.yearName}" starts before "${fromYear.yearName}".`);
      return;
    }

    // Show custom confirmation modal instead of confirm()
    this.promoteModalMessage = `Promote all students from "${fromYear?.yearName}" to "${toYear?.yearName}"? This cannot be undone.`;
    this._pendingPromotePayload = { fromYearId, toYearId };
    this.showPromoteModal = true;
  }

  onPromoteConfirmed(): void {
    this.showPromoteModal = false;
    if (!this._pendingPromotePayload) return;
    this.loading = true;
    this.svc.promoteStudents(this._pendingPromotePayload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        if (r.success) { this.showSuccess(r.message ?? 'Students promoted successfully!'); this.promoteStudentsForm.reset(); this.loadAcademicYears(); }
        this.loading = false;
        this._pendingPromotePayload = null;
      },
      error: (e) => { this.errorHandler.handle('Failed to promote students', e); this.loading = false; this._pendingPromotePayload = null; },
    });
  }

  onPromoteCancelled(): void {
    this.showPromoteModal       = false;
    this._pendingPromotePayload = null;
  }

  get filteredAdmins() {
    return this.filterList(this.admins, this.adminFilter,
      ['firstName', 'lastName', 'email', 'assignedBy']);
  }

  get activeAcademicYears()    { return this.academicYears.filter(y => y.isActive); }
  get availableTargetYears()   {
    const active = this.academicYears.find(y => y.isActive);
    if (!active) return this.academicYears.filter(y => !y.isActive && !y.isPromotionCompleted);
    const activeStart = new Date(active.startDate);
    return this.academicYears.filter(y => !y.isActive && !y.isPromotionCompleted && new Date(y.startDate) > activeStart);
  }

  // ── ADMIN ACCESS ──────────────────────────────────────────
  assignAdmin(): void {
    if (this.adminAssignForm.invalid) return;
    this.loading = true;
    this.svc.assignAdmin(this.adminAssignForm.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Admin role assigned successfully!'); this.adminAssignForm.reset(); this.loadUsers(); this.loadAdmins(); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to assign admin', e); this.loading = false; },
    });
  }

  openRemoveAdminModal(admin: any): void {
    this.adminToRemove     = admin;
    this.deleteModalTitle  = 'Remove Admin Role';
    this.deleteModalMessage = 'Are you sure you want to remove admin privileges from this user? They will no longer have access to admin features.';
    this.deleteItemName    = `${admin.firstName} ${admin.lastName}`;
    this.showRemoveAdminModal = true;
  }

  confirmRemoveAdmin(): void {
    if (!this.adminToRemove) return;
    this.loading = true;
    this.svc.removeAdmin(this.adminToRemove.userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { if (r.success) { this.showSuccess('Admin role removed successfully!'); this.loadUsers(); this.loadAdmins(); this.closeRemoveAdminModal(); } this.loading = false; },
      error: (e) => { this.errorHandler.handle('Failed to remove admin', e); this.loading = false; },
    });
  }

  closeRemoveAdminModal(): void { this.showRemoveAdminModal = false; this.adminToRemove = null; }

  // ── Input handlers ────────────────────────────────────────
  onClassNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9]/g, '');
    if (val !== '') { const num = parseInt(val, 10); if (num > 12) val = '12'; if (num < 1 && val.length > 0) val = val.slice(0, -1); }
    input.value = val;
    this.classForm.get('classNumber')?.setValue(val, { emitEvent: false });
  }

  onSectionNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1);
    input.value = val;
    this.sectionForm.get('sectionName')?.setValue(val, { emitEvent: false });
  }

  onYearNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9-]/g, '');
    if (val.length === 4 && !val.includes('-')) val = val + '-';
    if (val.length > 9) val = val.slice(0, 9);
    input.value = val;
    this.academicYearForm.get('yearName')?.setValue(val, { emitEvent: false });
    this.academicYearForm.get('yearName')?.updateValueAndValidity();
  }

  // ── Validators ────────────────────────────────────────────
  academicYearNameValidator() {
    return (control: any) => {
      const val: string = control.value || '';
      if (!val) return null;
      const match = val.match(/^(\d{4})-(\d{4})$/);
      if (!match) return { invalidFormat: true };
      const from = parseInt(match[1], 10), to = parseInt(match[2], 10);
      const currentYear = new Date().getFullYear();
      if (to !== from + 1)          return { notConsecutive: true };
      if (from < currentYear)        return { pastYear: true };
      if (from > currentYear + 1)    return { tooFarFuture: true };
      return null;
    };
  }

  academicYearDatesValidator() {
    return (group: any) => {
      const yearName  = group.get('yearName')?.value  || '';
      const startDate = group.get('startDate')?.value || '';
      const endDate   = group.get('endDate')?.value   || '';
      const errors: any = {};
      const match = yearName.match(/^(\d{4})-(\d{4})$/);
      if (!match || !startDate || !endDate) return null;
      const fromYear = parseInt(match[1], 10), toYear = parseInt(match[2], 10);
      const start = new Date(startDate), end = new Date(endDate);
      if (start.getFullYear() !== fromYear)  errors['startDateYearMismatch'] = true;
      if (end.getFullYear()   !== toYear)    errors['endDateYearMismatch']   = true;
      if (startDate && endDate && end <= start) errors['endBeforeStart']     = true;
      return Object.keys(errors).length ? errors : null;
    };
  }

  // ── Date min/max getters ──────────────────────────────────
  get startDateMin(): string { const m = (this.academicYearForm?.get('yearName')?.value || '').match(/^(\d{4})/); return m ? `${m[1]}-01-01` : this.today; }
  get startDateMax(): string { const m = (this.academicYearForm?.get('yearName')?.value || '').match(/^(\d{4})/); return m ? `${m[1]}-12-31` : ''; }
  get endDateMin():   string { const m = (this.academicYearForm?.get('yearName')?.value || '').match(/-(\d{4})$/); return m ? `${m[1]}-01-01` : this.today; }
  get endDateMax():   string { const m = (this.academicYearForm?.get('yearName')?.value || '').match(/-(\d{4})$/); return m ? `${m[1]}-12-31` : ''; }

  // ── Private helpers ───────────────────────────────────────
  private filterList(list: any[], query: string, fields: string[]): any[] {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(item => fields.some(f => (item[f] ?? '').toString().toLowerCase().includes(q)));
  }

  private showSuccess(msg: string): void { this.toastService.showSuccess('Success', msg); }
}