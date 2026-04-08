import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { Subscription } from 'rxjs';

interface MenuItem {
  icon:  string;
  label: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  private authService       = inject(AuthService);
  private masterDataService = inject(MasterDataService);

  userRole:             string | null = null;
  userName:             string | null = null;
  schoolName:           string | null = null;
  currentAcademicYear:  string | null = null;
  isLoadingAcademicYear = false;
  isCollapsed           = false;
  isMobileOpen          = false;

  // ── Admin submenu state ──────────────────────────────────
  isAdminMenuOpen = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  commonMenuItems: MenuItem[] = [];
  adminMenuItems:  MenuItem[] = [];

  private academicYearSubscription?: Subscription;

  get toggleBtnLeft(): string {
    return this.isCollapsed ? '56px' : '246px';
  }

  get isAdmin(): boolean {
    return this.userRole === 'Admin';
  }

  // ── All menu items ───────────────────────────────────────
  private readonly allCommonItems: MenuItem[] = [
    {
      icon:  'fas fa-th-large',
      label: 'Dashboard',
      route: '/dashboard',
      roles: ['Admin', 'Teacher', 'Student'],
    },
    {
      icon:  'fas fa-file-alt',
      label: 'Create Question Paper',
      route: '/create/exam',
      roles: ['Admin', 'Teacher'],
    },
    {
      icon:  'fas fa-eye',
      label: 'View Question Papers',
      route: '/view/exam',
      roles: ['Admin', 'Teacher'],
    },
    {
      icon:  'fas fa-upload',
      label: 'Upload Answer Sheet',
      route: '/upload-answer-sheets',
      roles: ['Admin', 'Teacher'],
    },
    {
      icon:  'fas fa-chart-bar',
      label: 'View Exam Result',
      route: '/results',
      roles: ['Admin', 'Teacher', 'Student'],
    },
    {
      icon:  'fas fa-key',
      label: 'Change Password',
      route: '/change-password',
      roles: ['Admin', 'Teacher', 'Student'],
    },
  ];

  private readonly allAdminOnlyItems: MenuItem[] = [
    {
      icon:  'fas fa-user-graduate',
      label: 'Students',
      route: '/students/list',
      roles: ['Admin'],
    },
    {
      icon:  'fas fa-chalkboard-teacher',
      label: 'Teachers',
      route: '/teachers/list',
      roles: ['Admin'],
    },
    {
      icon:  'fas fa-user-plus',
      label: 'Student Registration',
      route: '/registration/student',
      roles: ['Admin'],
    },
    {
      icon:  'fas fa-user-tie',
      label: 'Teacher Registration',
      route: '/registration/teacher',
      roles: ['Admin'],
    },
    {
      icon:  'fas fa-user-tag',
      label: 'Assign Subjects',
      route: '/assign-teacher-subjects',
      roles: ['Admin'],
    },
    {
      icon:  'fas fa-cog',
      label: 'Settings',
      route: '/admin-settings',
      roles: ['Admin'],
    },
  ];

  ngOnInit(): void {
    this.userRole   = this.authService.getUserRole();
    this.userName   = this.authService.getUserDisplayName();
    this.schoolName = this.authService.getSchoolName();
    this.filterMenuByRole();
    this.subscribeToAcademicYear();
    this.loadAcademicYear();
  }

  ngOnDestroy(): void {
    this.academicYearSubscription?.unsubscribe();
    document.body.style.overflow = '';
  }

  // ── Academic Year ────────────────────────────────────────

  private subscribeToAcademicYear(): void {
    this.academicYearSubscription = this.masterDataService.academicYear$
      .subscribe((yearName) => {
        if (yearName) this.currentAcademicYear = yearName;
      });
  }

  private loadAcademicYear(): void {
    this.isLoadingAcademicYear = true;
    this.masterDataService.getCurrentAcademicYear().subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.currentAcademicYear = 'No Active Year';
        }
        this.isLoadingAcademicYear = false;
      },
      error: () => {
        this.currentAcademicYear  = 'Not Available';
        this.isLoadingAcademicYear = false;
      },
    });
  }

  // ── Menu ─────────────────────────────────────────────────

  private filterMenuByRole(): void {
    if (!this.userRole) {
      this.commonMenuItems = [];
      this.adminMenuItems  = [];
      return;
    }
    this.commonMenuItems = this.allCommonItems.filter(item =>
      item.roles.includes(this.userRole!)
    );
    this.adminMenuItems = this.isAdmin ? this.allAdminOnlyItems : [];
  }

  toggleAdminMenu(): void {
    if (!this.isCollapsed) {
      this.isAdminMenuOpen = !this.isAdminMenuOpen;
    }
  }

  // ── Desktop collapse ─────────────────────────────────────

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) this.isAdminMenuOpen = false;
    this.collapsedChange.emit(this.isCollapsed);
  }

  // ── Mobile drawer ────────────────────────────────────────

  openMobileSidebar(): void {
    this.isMobileOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeMobileSidebar(): void {
    this.isMobileOpen = false;
    document.body.style.overflow = '';
  }

  // ── Logout ───────────────────────────────────────────────

  logout(): void {
    this.closeMobileSidebar();
    this.authService.logout();
  }
}