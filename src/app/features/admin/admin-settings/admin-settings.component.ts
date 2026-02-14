import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DeleteConfirmationComponent,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
})
export class AdminSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(AdminSettingsService);

  // ── Tab state ──────────────────────────────────────────────
  mainTab: 'master' | 'assign' | 'academic' | 'admin' = 'master';
  masterTab: 'class' | 'section' | 'subject' | 'examtype' = 'class';
  assignTab: 'assign-section' | 'assign-subject' | 'assign-examtype' =
    'assign-section';

  // ── Master data lists ──────────────────────────────────────
  classes: any[] = [];
  masterSections: any[] = []; // stand-alone section names (A, B, C …)
  masterSubjects: any[] = []; // stand-alone subject names
  masterExamTypes: any[] = []; // stand-alone exam type names

  // ── Assignment lists ───────────────────────────────────────
  assignedSections: any[] = []; // class ↔ section links
  assignedSubjects: any[] = []; // class ↔ section ↔ subject links
  assignedExamTypes: any[] = []; // class ↔ section ↔ examtype links

  // ── Academic Year & Admin lists ───────────────────────────
  academicYears: any[] = [];
  users: any[] = [];
  admins: any[] = [];

  // ── Sections loaded dynamically for subject/examtype forms ─
  sectionsForAssignSubject: any[] = [];
  sectionsForAssignExamType: any[] = [];

  // ── Forms ──────────────────────────────────────────────────
  classForm!: FormGroup;
  sectionForm!: FormGroup;
  subjectForm!: FormGroup;
  examTypeForm!: FormGroup;

  assignSectionForm!: FormGroup;
  assignSubjectForm!: FormGroup;
  assignExamTypeForm!: FormGroup;

  // ── Academic Year & Admin forms ────────────────────────────
  academicYearForm!: FormGroup;
  promoteStudentsForm!: FormGroup;
  adminAssignForm!: FormGroup;

  // ── UI state ───────────────────────────────────────────────
  loading = false;
  success = '';
  error = '';

  // ── Filters ───────────────────────────────────────────────
  classFilter = '';
  sectionFilter = '';
  subjectFilter = '';
  examTypeFilter = '';
  assignSectionFilter = '';
  assignSubjectFilter = '';
  assignExamTypeFilter = '';
  academicYearFilter = '';

  // ── Delete modal ──────────────────────────────────────────
  showDeleteModal = false;
  deleteModalTitle = '';
  deleteModalMessage = '';
  deleteItemName = '';
  deleteType = '';
  itemToDelete: any = null;

  showRemoveAdminModal = false;
  adminToRemove: any = null;

  // ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForms();
    this.loadAll();
  }

  // ── Form initialisation ───────────────────────────────────
  initForms(): void {
    // Master forms — no class dependency
    this.classForm = this.fb.group({ classNumber: ['', Validators.required] });
    this.sectionForm = this.fb.group({
      sectionName: ['', Validators.required],
    });
    this.subjectForm = this.fb.group({
      subjectName: ['', Validators.required],
    });
    this.examTypeForm = this.fb.group({
      examTypeName: ['', Validators.required],
    });

    // Assignment forms
    this.assignSectionForm = this.fb.group({
      classId: ['', Validators.required],
      sectionId: ['', Validators.required],
    });

    this.assignSubjectForm = this.fb.group({
      classId: ['', Validators.required],
      //sectionId: ['', Validators.required],
      subjectId: ['', Validators.required],
    });

    this.assignExamTypeForm = this.fb.group({
      classId: ['', Validators.required],
      //sectionId:  ['', Validators.required],
      examTypeId: ['', Validators.required],
    });

    // Academic Year forms
    this.academicYearForm = this.fb.group({
      yearName: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });

    this.promoteStudentsForm = this.fb.group({
      fromYearId: ['', Validators.required],
      toYearId: ['', Validators.required],
    });

    // Admin form
    this.adminAssignForm = this.fb.group({
      userId: ['', Validators.required],
    });
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

  loadClasses(): void {
    this.svc.getClasses().subscribe({
      next: (r) => {
        if (r.success) this.classes = r.data ?? [];
      },
    });
  }

  loadMasterSections(): void {
    this.svc.getMasterSections().subscribe({
      next: (r) => {
        if (r.success) this.masterSections = r.data ?? [];
      },
    });
  }

  loadMasterSubjects(): void {
    this.svc.getMasterSubjects().subscribe({
      next: (r) => {
        if (r.success) this.masterSubjects = r.data ?? [];
      },
    });
  }

  loadMasterExamTypes(): void {
    this.svc.getMasterExamTypes().subscribe({
      next: (r) => {
        if (r.success) this.masterExamTypes = r.data ?? [];
      },
    });
  }

  loadAssignedSections(): void {
    this.svc.getAssignedSections().subscribe({
      next: (r) => {
        if (r.success) this.assignedSections = r.data ?? [];
      },
    });
  }

  loadAssignedSubjects(): void {
    this.svc.getAssignedSubjects().subscribe({
      next: (r) => {
        if (r.success) this.assignedSubjects = r.data ?? [];
      },
    });
  }

  loadAssignedExamTypes(): void {
    this.svc.getAssignedExamTypes().subscribe({
      next: (r) => {
        if (r.success) this.assignedExamTypes = r.data ?? [];
      },
    });
  }

  loadAcademicYears(): void {
    this.svc.getAcademicYears().subscribe({
      next: (r) => {
        if (r.success) this.academicYears = r.data ?? [];
      },
    });
  }

  loadUsers(): void {
    this.svc.getUsers().subscribe({
      next: (r) => {
        if (r.success) this.users = r.data ?? [];
      },
    });
  }

  loadAdmins(): void {
    this.svc.getAdmins().subscribe({
      next: (r) => {
        if (r.success) this.admins = r.data ?? [];
      },
    });
  }

  // ── Dynamic section loading for assignment forms ──────────
  onAssignSubjectClassChange(event: any): void {
    const classId = +event.target.value;
    this.assignSubjectForm.patchValue({ sectionId: '' });
    this.sectionsForAssignSubject = [];
    if (!classId) return;
    this.svc.getSectionsByClass(classId).subscribe({
      next: (r) => {
        if (r.success) this.sectionsForAssignSubject = r.data ?? [];
      },
    });
  }

  onAssignExamTypeClassChange(event: any): void {
    const classId = +event.target.value;
    this.assignExamTypeForm.patchValue({ sectionId: '' });
    this.sectionsForAssignExamType = [];
    if (!classId) return;
    this.svc.getSectionsByClass(classId).subscribe({
      next: (r) => {
        if (r.success) this.sectionsForAssignExamType = r.data ?? [];
      },
    });
  }

  // ── Tab navigation ────────────────────────────────────────
  setMainTab(tab: 'master' | 'assign' | 'academic' | 'admin'): void {
    this.mainTab = tab;
    this.clearMessages();
  }

  setMasterTab(tab: 'class' | 'section' | 'subject' | 'examtype'): void {
    this.masterTab = tab;
    this.clearMessages();
  }

  setAssignTab(
    tab: 'assign-section' | 'assign-subject' | 'assign-examtype',
  ): void {
    this.assignTab = tab;
    this.clearMessages();
  }

  // ── MASTER: Create ────────────────────────────────────────
  createClass(): void {
    if (this.classForm.invalid) return;
    this.loading = true;
    this.svc.createClass(this.classForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Class created successfully!');
          this.classForm.reset();
          this.loadClasses();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to create class');
        this.loading = false;
      },
    });
  }

  createSection(): void {
    if (this.sectionForm.invalid) return;
    this.loading = true;
    this.svc.createMasterSection(this.sectionForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Section created successfully!');
          this.sectionForm.reset();
          this.loadMasterSections();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to create section');
        this.loading = false;
      },
    });
  }

  createSubject(): void {
    if (this.subjectForm.invalid) return;
    this.loading = true;
    this.svc.createMasterSubject(this.subjectForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Subject created successfully!');
          this.subjectForm.reset();
          this.loadMasterSubjects();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to create subject');
        this.loading = false;
      },
    });
  }

  createExamType(): void {
    if (this.examTypeForm.invalid) return;
    this.loading = true;
    this.svc.createMasterExamType(this.examTypeForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Exam Type created successfully!');
          this.examTypeForm.reset();
          this.loadMasterExamTypes();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to create exam type');
        this.loading = false;
      },
    });
  }

  // ── ASSIGNMENTS: Create ───────────────────────────────────
  assignSection(): void {
    if (this.assignSectionForm.invalid) return;
    this.loading = true;
    this.svc.assignSection(this.assignSectionForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Section assigned successfully!');
          this.assignSectionForm.reset();
          this.loadAssignedSections();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to assign section');
        this.loading = false;
      },
    });
  }

  assignSubject(): void {
    if (this.assignSubjectForm.invalid) return;
    this.loading = true;
    this.svc.assignSubject(this.assignSubjectForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Subject assigned successfully!');
          this.assignSubjectForm.reset();
          this.sectionsForAssignSubject = [];
          this.loadAssignedSubjects();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to assign subject');
        this.loading = false;
      },
    });
  }

  assignExamType(): void {
    if (this.assignExamTypeForm.invalid) return;
    this.loading = true;
    this.svc.assignExamType(this.assignExamTypeForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Exam Type assigned successfully!');
          this.assignExamTypeForm.reset();
          this.sectionsForAssignExamType = [];
          this.loadAssignedExamTypes();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to assign exam type');
        this.loading = false;
      },
    });
  }

  // ── Delete modal ──────────────────────────────────────────
  openDeleteModal(type: string, item: any): void {
    this.deleteType = type;
    this.itemToDelete = item;
    const titles: Record<string, [string, string, string]> = {
      class: ['Delete Class', 'Delete this class?', item.className ?? ''],
      'master-section': [
        'Delete Section',
        'Delete this section?',
        item.sectionName ?? '',
      ],
      'master-subject': [
        'Delete Subject',
        'Delete this subject?',
        item.subjectName ?? '',
      ],
      'master-examtype': [
        'Delete Exam Type',
        'Delete this exam type?',
        item.examTypeName ?? '',
      ],
      'assigned-section': [
        'Remove Assignment',
        'Remove section assignment?',
        `Class ${item.classNumber} → ${item.sectionName}`,
      ],
      'assigned-subject': [
        'Remove Assignment',
        'Remove subject assignment?',
        `Class ${item.classNumber}  → ${item.subjectName}`,
      ],
      'assigned-examtype': [
        'Remove Assignment',
        'Remove exam type assignment?',
        `Class ${item.classNumber}  → ${item.examTypeName}`,
      ],
    };
    const [title, message, name] = titles[type] ?? [
      'Delete',
      'Confirm delete?',
      '',
    ];
    this.deleteModalTitle = title;
    this.deleteModalMessage = message;
    this.deleteItemName = name;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.itemToDelete) return;
    this.loading = true;
    const id = this.itemToDelete.id;

    const actions: Record<string, () => void> = {
      class: () =>
        this.svc.deleteClass(id).subscribe({
          next: () => {
            this.showSuccess('Class deleted!');
            this.loadClasses();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'master-section': () =>
        this.svc.deleteMasterSection(id).subscribe({
          next: () => {
            this.showSuccess('Section deleted!');
            this.loadMasterSections();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'master-subject': () =>
        this.svc.deleteMasterSubject(id).subscribe({
          next: () => {
            this.showSuccess('Subject deleted!');
            this.loadMasterSubjects();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'master-examtype': () =>
        this.svc.deleteMasterExamType(id).subscribe({
          next: () => {
            this.showSuccess('Exam type deleted!');
            this.loadMasterExamTypes();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'assigned-section': () =>
        this.svc.removeAssignedSection(id).subscribe({
          next: () => {
            this.showSuccess('Assignment removed!');
            this.loadAssignedSections();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'assigned-subject': () =>
        this.svc.removeAssignedSubject(id).subscribe({
          next: () => {
            this.showSuccess('Assignment removed!');
            this.loadAssignedSubjects();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
      'assigned-examtype': () =>
        this.svc.removeAssignedExamType(id).subscribe({
          next: () => {
            this.showSuccess('Assignment removed!');
            this.loadAssignedExamTypes();
            this.resetDeleteModal();
          },
          error: (e) => {
            this.showError(e.error?.message || 'Failed');
            this.resetDeleteModal();
          },
        }),
    };

    actions[this.deleteType]?.();
  }

  onDeleteCancelled(): void {
    this.resetDeleteModal();
  }

  resetDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteType = '';
    this.itemToDelete = null;
    this.loading = false;
  }

  // ── Filtered getters ──────────────────────────────────────
  get filteredClasses() {
    return this.filterList(this.classes, this.classFilter, ['classNumber']);
  }

  get filteredMasterSections() {
    return this.filterList(this.masterSections, this.sectionFilter, [
      'sectionName',
    ]);
  }

  get filteredMasterSubjects() {
    return this.filterList(this.masterSubjects, this.subjectFilter, [
      'subjectName',
    ]);
  }

  get filteredMasterExamTypes() {
    return this.filterList(this.masterExamTypes, this.examTypeFilter, [
      'examTypeName',
    ]);
  }

  get filteredAssignedSections() {
    return this.filterList(this.assignedSections, this.assignSectionFilter, [
      'classNumber',
      'sectionName',
    ]);
  }

  get filteredAssignedSubjects() {
    return this.filterList(this.assignedSubjects, this.assignSubjectFilter, [
      'classNumber',
      'sectionName',
      'subjectName',
    ]);
  }

  get filteredAssignedExamTypes() {
    return this.filterList(this.assignedExamTypes, this.assignExamTypeFilter, [
      'classNumber',
      'sectionName',
      'examTypeName',
    ]);
  }

  // ── ACADEMIC YEAR ─────────────────────────────────────────
  createAcademicYear(): void {
    if (this.academicYearForm.invalid) return;
    this.loading = true;
    this.svc.createAcademicYear(this.academicYearForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Academic Year created successfully!');
          this.academicYearForm.reset();
          this.loadAcademicYears();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to create academic year');
        this.loading = false;
      },
    });
  }

  setActiveAcademicYear(id: number): void {
    this.loading = true;
    this.svc.setActiveAcademicYear(id).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Active academic year updated!');
          this.loadAcademicYears();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to set active year');
        this.loading = false;
      },
    });
  }

  promoteStudents(): void {
    if (this.promoteStudentsForm.invalid) return;
    const fromYearId = +this.promoteStudentsForm.get('fromYearId')?.value;
    const toYearId = +this.promoteStudentsForm.get('toYearId')?.value;
    const fromYear = this.academicYears.find((y) => y.id === fromYearId);
    const toYear = this.academicYears.find((y) => y.id === toYearId);

    if (
      fromYear &&
      toYear &&
      new Date(fromYear.startDate) >= new Date(toYear.startDate)
    ) {
      this.showError(
        `Cannot promote backward. "${toYear.yearName}" starts before "${fromYear.yearName}".`,
      );
      return;
    }

    if (
      !confirm(
        `Promote all students from "${fromYear?.yearName}" to "${toYear?.yearName}"?`,
      )
    )
      return;

    this.loading = true;
    this.svc.promoteStudents({ fromYearId, toYearId }).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess(r.message || 'Students promoted successfully!');
          this.promoteStudentsForm.reset();
          this.loadAcademicYears();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to promote students');
        this.loading = false;
      },
    });
  }

  get activeAcademicYears() {
    return this.academicYears.filter((y) => y.isActive);
  }

  get availableTargetYears() {
    const active = this.academicYears.find((y) => y.isActive);
    if (!active)
      return this.academicYears.filter(
        (y) => !y.isActive && !y.isPromotionCompleted,
      );
    const activeStart = new Date(active.startDate);
    return this.academicYears.filter(
      (y) =>
        !y.isActive &&
        !y.isPromotionCompleted &&
        new Date(y.startDate) > activeStart,
    );
  }

  get filteredAcademicYears() {
    return this.filterList(this.academicYears, this.academicYearFilter, [
      'yearName',
    ]);
  }

  // ── ADMIN ACCESS ──────────────────────────────────────────
  assignAdmin(): void {
    if (this.adminAssignForm.invalid) return;
    this.loading = true;
    this.svc.assignAdmin(this.adminAssignForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Admin role assigned successfully!');
          this.adminAssignForm.reset();
          this.loadUsers();
          this.loadAdmins();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to assign admin');
        this.loading = false;
      },
    });
  }

  openRemoveAdminModal(admin: any): void {
    this.adminToRemove = admin;
    this.deleteModalTitle = 'Remove Admin Role';
    this.deleteModalMessage =
      'Are you sure you want to remove admin privileges from this user? They will no longer have access to admin features.';
    this.deleteItemName = `${admin.firstName} ${admin.lastName}`;
    this.showRemoveAdminModal = true;
  }

  confirmRemoveAdmin(): void {
    if (!this.adminToRemove) return;

    this.loading = true;
    this.svc.removeAdmin(this.adminToRemove.userId).subscribe({
      next: (r) => {
        if (r.success) {
          this.showSuccess('Admin role removed successfully!');
          this.loadUsers();
          this.loadAdmins();
          this.closeRemoveAdminModal();
        }
        this.loading = false;
      },
      error: (e) => {
        this.showError(e.error?.message || 'Failed to remove admin');
        this.loading = false;
      },
    });
  }

  closeRemoveAdminModal(): void {
    this.showRemoveAdminModal = false;
    this.adminToRemove = null;
  }

  private filterList(list: any[], query: string, fields: string[]): any[] {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((item) =>
      fields.some((f) => (item[f] ?? '').toString().toLowerCase().includes(q)),
    );
  }

  // ── Helpers ───────────────────────────────────────────────
  private showSuccess(msg: string): void {
    this.success = msg;
    this.error = '';
    setTimeout(() => (this.success = ''), 3500);
  }

  private showError(msg: string): void {
    this.error = msg;
    this.success = '';
    setTimeout(() => (this.error = ''), 4000);
  }

  clearMessages(): void {
    this.success = '';
    this.error = '';
  }
}
