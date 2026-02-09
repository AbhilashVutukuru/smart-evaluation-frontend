import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule,DeleteConfirmationComponent],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminSettingsService = inject(AdminSettingsService);
  private registrationService = inject(RegistrationService);
  private toastService = inject(ToastService);

  activeTab: 'class' | 'section' | 'subject' | 'examtype' | 'academic' | 'admin' = 'class';
  
  // Forms
  classForm!: FormGroup;
  sectionForm!: FormGroup;
  subjectForm!: FormGroup;
  examTypeForm!: FormGroup;
  academicYearForm!: FormGroup;
  promoteStudentsForm!: FormGroup;
  adminAssignForm!: FormGroup;

  // Data
  classes: any[] = [];
  sections: any[] = [];
  subjects: any[] = [];
  examTypes: any[] = [];
  academicYears: any[] = [];
  users: any[] = [];
  admins: any[] = [];

  loading = false;
  error = '';
  success = '';

  // Filters
  classFilter = '';
  sectionFilter = '';
  subjectFilter = '';
  examTypeFilter = '';
  academicYearFilter = '';

    // Delete Modal - ADD THESE
  showDeleteModal = false;
  deleteModalTitle = '';
  deleteModalMessage = '';
  deleteItemName = '';
  deleteType = '';
  itemToDelete: any = null;

  ngOnInit(): void {
    this.initForms();
    this.loadAllData();
  }

  initForms(): void {
    this.classForm = this.fb.group({
      className: ['', Validators.required],
      displayOrder: [1, [Validators.required, Validators.min(1)]]
    });

    this.sectionForm = this.fb.group({
      classId: ['', Validators.required],
      sectionName: ['', Validators.required],
      displayOrder: [1, [Validators.required, Validators.min(1)]]
    });

    this.subjectForm = this.fb.group({
      classId: ['', Validators.required],
      sectionId: ['', Validators.required],
      subjectName: ['', Validators.required],
      subjectCode: ['', Validators.required],
      displayOrder: [1, [Validators.required, Validators.min(1)]]
    });

    this.examTypeForm = this.fb.group({
      classId: ['', Validators.required],     // Only class dependency
      examTypeName: ['', Validators.required],
      displayOrder: [1, [Validators.required, Validators.min(1)]]
    });

    this.academicYearForm = this.fb.group({
      yearName: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });

    this.promoteStudentsForm = this.fb.group({
      fromYearId: ['', Validators.required],
      toYearId: ['', Validators.required]
    });

    this.adminAssignForm = this.fb.group({
      userId: ['', Validators.required]
    });

    // Watch for section form class changes
    this.sectionForm.get('classId')?.valueChanges.subscribe(() => {
      // Just validate that class is selected
    });

    // Watch for subject form class/section changes
    this.subjectForm.get('classId')?.valueChanges.subscribe(classId => {
      this.subjectForm.patchValue({ sectionId: '' });
      this.loadSectionsForClass(+classId);
    });
  }

  loadAllData(): void {
    this.loadClasses();
    this.loadSections();
    this.loadSubjects();
    this.loadExamTypes();
    this.loadAcademicYears();
    this.loadUsers();
    this.loadAdmins();
  }

  loadClasses(): void {
    this.adminSettingsService.getClasses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.classes = response.data;
        }
      }
    });
  }

  loadSections(): void {
    this.adminSettingsService.getSections().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sections = response.data;
        }
      }
    });
  }

  loadSubjects(): void {
    this.adminSettingsService.getSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects = response.data;
        }
      }
    });
  }

  loadExamTypes(): void {
    this.adminSettingsService.getExamTypes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.examTypes = response.data;
        }
      }
    });
  }

  loadAcademicYears(): void {
    this.adminSettingsService.getAcademicYears().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.academicYears = response.data;
          console.log('Academic years loaded:', this.academicYears);
        }
      }
    });
  }

  loadUsers(): void {
    this.adminSettingsService.getUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users = response.data;
        }
      }
    });
  }

  loadAdmins(): void {
    this.adminSettingsService.getAdmins().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.admins = response.data;
        }
      }
    });
  }

  // Helper methods for hierarchical dropdowns
  sectionsForClass: any[] = [];

  loadSectionsForClass(classId: number): void {
    if (!classId) return;
    this.registrationService.getSections(classId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sectionsForClass = response.data;
        }
      }
    });
  }

  // Class Operations
  createClass(): void {
    if (this.classForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.createClass(this.classForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Class created successfully!';
          this.classForm.reset({ displayOrder: 1 });
          this.loadClasses();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create class';
        this.loading = false;
      }
    });
  } 

  openDeleteModal(type: string, item: any): void {
    this.deleteType = type;
    this.itemToDelete = item;
    
    switch(type) {
      case 'class':
        this.deleteModalTitle = 'Delete Class';
        this.deleteModalMessage = 'Are you sure you want to delete this class?';
        this.deleteItemName = item.className;
        break;
      case 'section':
        this.deleteModalTitle = 'Delete Section';
        this.deleteModalMessage = 'Are you sure you want to delete this section?';
        this.deleteItemName = `${item.className} - ${item.sectionName}`;
        break;
      case 'subject':
        this.deleteModalTitle = 'Delete Subject';
        this.deleteModalMessage = 'Are you sure you want to delete this subject?';
        this.deleteItemName = `${item.subjectName} (${item.subjectCode})`;
        break;
      case 'examtype':
        this.deleteModalTitle = 'Delete Exam Type';
        this.deleteModalMessage = 'Are you sure you want to delete this exam type?';
        this.deleteItemName = item.examTypeName;
        break;
      case 'academic':
        this.deleteModalTitle = 'Delete Academic Year';
        this.deleteModalMessage = 'Are you sure you want to delete this academic year?';
        this.deleteItemName = item.yearName;
        break;
    }
    
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.itemToDelete) return;

    this.loading = true;
    
    switch(this.deleteType) {
      case 'class':
        this.adminSettingsService.deleteClass(this.itemToDelete.id).subscribe({
          next: () => {
            this.success = 'Class deleted successfully!';
            this.loadClasses();
            this.resetDeleteModal();
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to delete class';
            this.resetDeleteModal();
          }
        });
        break;
      case 'section':
        this.adminSettingsService.deleteSection(this.itemToDelete.id).subscribe({
          next: () => {
            this.success = 'Section deleted successfully!';
            this.loadSections();
            this.resetDeleteModal();
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to delete section';
            this.resetDeleteModal();
          }
        });
        break;
      case 'subject':
        this.adminSettingsService.deleteSubject(this.itemToDelete.id).subscribe({
          next: () => {
            this.success = 'Subject deleted successfully!';
            this.loadSubjects();
            this.resetDeleteModal();
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to delete subject';
            this.resetDeleteModal();
          }
        });
        break;
      case 'examtype':
        this.adminSettingsService.deleteExamType(this.itemToDelete.id).subscribe({
          next: () => {
            this.success = 'Exam type deleted successfully!';
            this.loadExamTypes();
            this.resetDeleteModal();
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to delete exam type';
            this.resetDeleteModal();
          }
        });
        break;
      // case 'academic':
      //   this.adminSettingsService.deleteAcademicYear(this.itemToDelete.id).subscribe({
      //     next: () => {
      //       this.success = 'Academic year deleted successfully!';
      //       this.loadAcademicYears();
      //       this.resetDeleteModal();
      //     },
      //     error: (err) => {
      //       this.error = err.error?.message || 'Failed to delete academic year';
      //       this.resetDeleteModal();
      //     }
      //   });
      //   break;
    }
  }

  onDeleteCancelled(): void {
    this.resetDeleteModal();
  }

  resetDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteType = '';
    this.itemToDelete = null;
    this.deleteModalTitle = '';
    this.deleteModalMessage = '';
    this.deleteItemName = '';
    this.loading = false;
  }

  

  // Section Operations
  createSection(): void {
    if (this.sectionForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.createSection(this.sectionForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Section created successfully!';
          this.sectionForm.reset({ displayOrder: 1 });
          this.loadSections();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create section';
        this.loading = false;
      }
    });
  }

  // deleteSection(id: number, isUsed: boolean): void {
  //   if (isUsed) {
  //     this.error = 'Cannot delete section that is already in use';
  //     return;
  //   }

  //   if (!confirm('Are you sure you want to delete this section?')) return;

  //   this.adminSettingsService.deleteSection(id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.success = 'Section deleted successfully!';
  //         this.loadSections();
  //       }
  //     },
  //     error: (error) => {
  //       this.error = error.error?.message || 'Failed to delete section';
  //     }
  //   });
  // }

  // Subject Operations
  createSubject(): void {
    if (this.subjectForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.createSubject(this.subjectForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Subject created successfully!';
          this.subjectForm.reset({ displayOrder: 1 });
          this.loadSubjects();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create subject';
        this.loading = false;
      }
    });
  }

  // deleteSubject(id: number, isUsed: boolean): void {
  //   if (isUsed) {
  //     this.error = 'Cannot delete subject that is already in use';
  //     return;
  //   }

  //   if (!confirm('Are you sure you want to delete this subject?')) return;

  //   this.adminSettingsService.deleteSubject(id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.success = 'Subject deleted successfully!';
  //         this.loadSubjects();
  //       }
  //     },
  //     error: (error) => {
  //       this.error = error.error?.message || 'Failed to delete subject';
  //     }
  //   });
  // }

  // ExamType Operations
  createExamType(): void {
    if (this.examTypeForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.createExamType(this.examTypeForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Exam Type created successfully!';
          this.examTypeForm.reset({ displayOrder: 1 });
          this.loadExamTypes();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create exam type';
        this.loading = false;
      }
    });
  }

  // deleteExamType(id: number, isUsed: boolean): void {
  //   if (isUsed) {
  //     this.error = 'Cannot delete exam type that is already in use';
  //     return;
  //   }

  //   if (!confirm('Are you sure you want to delete this exam type?')) return;

  //   this.adminSettingsService.deleteExamType(id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.success = 'Exam Type deleted successfully!';
  //         this.loadExamTypes();
  //       }
  //     },
  //     error: (error) => {
  //       this.error = error.error?.message || 'Failed to delete exam type';
  //     }
  //   });
  // }

  // Academic Year Operations
  createAcademicYear(): void {
    if (this.academicYearForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.createAcademicYear(this.academicYearForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Academic Year created successfully!';
          this.academicYearForm.reset();
          this.loadAcademicYears();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create academic year';
        this.loading = false;
      }
    });
  }

  setActiveAcademicYear(id: number): void {
    this.adminSettingsService.setActiveAcademicYear(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Active academic year updated!';
          this.loadAcademicYears();
          this.clearMessages();
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to set active year';
        this.clearMessages();
      }
    });
  }

  promoteStudents(): void {
    if (this.promoteStudentsForm.invalid) {
      this.error = 'Please select both academic years';
      this.clearMessages();
      return;
    }

    const fromYearId = +this.promoteStudentsForm.get('fromYearId')?.value;
    const toYearId = +this.promoteStudentsForm.get('toYearId')?.value;

    console.log('Form values:', { 
      fromYearId, 
      toYearId, 
      fromYearIdType: typeof fromYearId, 
      toYearIdType: typeof toYearId 
    });

    if (!fromYearId || !toYearId) {
      this.error = 'Please select both academic years';
      this.clearMessages();
      return;
    }

    if (fromYearId === toYearId) {
      const selectedYear = this.academicYears.find(y => y.id === fromYearId);
      this.error = `From and To academic years must be different. You selected "${selectedYear?.yearName}" for both.`;
      this.clearMessages();
      return;
    }

    const fromYear = this.academicYears.find(y => y.id === fromYearId);
    const toYear = this.academicYears.find(y => y.id === toYearId);
    
    if (!confirm(`This will promote all students from "${fromYear?.yearName}" to "${toYear?.yearName}". Continue?`)) {
      return;
    }

    this.loading = true;
    const data = { fromYearId, toYearId };
    
    console.log('Promoting students with data:', data);
    
    this.adminSettingsService.promoteStudents(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = response.message || 'Students promoted successfully!';
          this.promoteStudentsForm.reset();
          this.clearMessages();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to promote students';
        this.loading = false;
        this.clearMessages();
      }
    });
  }

  // Admin Assignment
  assignAdmin(): void {
    if (this.adminAssignForm.invalid) return;

    this.loading = true;
    this.adminSettingsService.assignAdmin(this.adminAssignForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Admin role assigned successfully!';
          this.adminAssignForm.reset();
          this.loadUsers();  // Refresh available users
          this.loadAdmins(); // Refresh admin list
          this.clearMessages();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to assign admin';
        this.loading = false;
        this.clearMessages();       
      }
    });
  }

  removeAdmin(userId: number): void {
    if (!confirm('Are you sure you want to remove admin role from this user?')) return;

    this.loading = true;
    this.adminSettingsService.removeAdmin(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Admin role removed successfully!';
          this.loadUsers();  // Refresh available users
          this.loadAdmins(); // Refresh admin list
          this.clearMessages();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to remove admin';
        this.loading = false;
        this.clearMessages();
      }
    });
  }

  setActiveTab(tab: any): void {
    this.activeTab = tab;
    this.error = '';
    this.success = '';
  }

  clearMessages(): void {
    setTimeout(() => {
      this.error = '';
      this.success = '';
    }, 3000);
  }

  // Filter methods
  get filteredClasses() {
    if (!this.classFilter) return this.classes;
    const filter = this.classFilter.toLowerCase();
    return this.classes.filter(c => 
      c.className.toLowerCase().includes(filter)
    );
  }

  get filteredSections() {
    if (!this.sectionFilter) return this.sections;
    const filter = this.sectionFilter.toLowerCase();
    return this.sections.filter(s => 
      s.sectionName.toLowerCase().includes(filter) ||
      s.className.toLowerCase().includes(filter)
    );
  }

  get filteredSubjects() {
    if (!this.subjectFilter) return this.subjects;
    const filter = this.subjectFilter.toLowerCase();
    return this.subjects.filter(s => 
      s.subjectName.toLowerCase().includes(filter) ||
      s.subjectCode.toLowerCase().includes(filter) ||
      s.className.toLowerCase().includes(filter)
    );
  }

  get filteredExamTypes() {
    if (!this.examTypeFilter) return this.examTypes;
    const filter = this.examTypeFilter.toLowerCase();
    return this.examTypes.filter(e => 
      e.examTypeName.toLowerCase().includes(filter) ||
      e.className.toLowerCase().includes(filter)
    );
  }

  get filteredAcademicYears() {
    if (!this.academicYearFilter) return this.academicYears;
    const filter = this.academicYearFilter.toLowerCase();
    return this.academicYears.filter(y => 
      y.yearName.toLowerCase().includes(filter)
    );
  }
}