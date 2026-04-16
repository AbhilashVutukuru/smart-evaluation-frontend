import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NonTeachingStaffService } from '../../../core/services/non-teaching-staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DeleteConfirmationComponent } from '../../../shared/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-non-teaching-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationComponent],
  templateUrl: './non-teaching-list.component.html',
  styleUrls: ['./non-teaching-list.component.css'],
})
export class NonTeachingListComponent implements OnInit {
  private staffService  = inject(NonTeachingStaffService);
  private toast         = inject(ToastService);
  private errorHandler  = inject(ErrorHandlerService);
  private router        = inject(Router);

  staffList: any[]     = [];
  filteredStaff: any[] = [];
  searchTerm           = '';
  loading              = false;
  deleting             = false;
  showDeleteModal      = false;
  staffToDelete: any   = null;

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.staffService.getAll().subscribe({
      next: (data) => {
        this.staffList     = data;
        this.filteredStaff = data;
        this.loading       = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorHandler.handle('Failed to load staff', err);
      },
    });
  }

  onSearchInput(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredStaff = this.staffList.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.employeeCode?.toLowerCase().includes(term) ||
      s.department?.toLowerCase().includes(term) ||
      s.designation?.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm    = '';
    this.filteredStaff = this.staffList;
  }

  viewDetails(id: number): void {
    this.router.navigate(['/non-teaching-staff/view', id]);
  }

  editStaff(id: number): void {
    this.router.navigate(['/non-teaching-staff/edit', id]);
  }

  deleteStaff(staff: any): void {
    this.staffToDelete  = staff;
    this.showDeleteModal = true;
  }

  onDeleteConfirmed(): void {
    if (!this.staffToDelete) return;
    this.deleting = true;
    this.staffService.delete(this.staffToDelete.id).subscribe({
      next: () => {
        this.deleting        = false;
        this.showDeleteModal  = false;
        this.staffToDelete   = null;
        this.toast.showSuccess('Success', 'Staff deleted successfully');
        this.loadStaff();
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
    this.staffToDelete   = null;
    this.deleting        = false;
  }

  getStaffFullName(staff: any): string {
    return `${staff.firstName} ${staff.lastName}`;
  }
}