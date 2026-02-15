import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { filter, Subscription } from 'rxjs';

// Menu item interface with roles
interface MenuItem {
  icon: string;
  label: string;
  route: string;
  roles: string[]; // Who can see this menu
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  // Make authService public so template can access it
  public authService = inject(AuthService);
  private masterDataService = inject(MasterDataService);
  

  // Current user role
  userRole: string | null = null;

  // ✅ NEW: User name and email
  userName: string | null = null;
  userEmail: string | null = null;

  currentAcademicYear: string | null = null;
  isLoadingAcademicYear = false;

  // Filtered menu items based on role
  visibleMenuItems: MenuItem[] = [];

  private academicYearSubscription?: Subscription;

  // All menu items with role permissions
  private allMenuItems: MenuItem[] = [
    {
      icon: 'fas fa-th-large',
      label: 'Dashboard',
      route: '/dashboard',
      roles: ['Admin', 'Teacher', 'Student'],
    },
    {
      icon: 'fas fa-user-graduate',
      label: 'Students',
      route: '/students/list',
      roles: ['Admin'],
    },
    {
      icon: 'fas fa-chalkboard-teacher',
      label: 'Teachers',
      route: '/teachers/list',
      roles: ['Admin'],
    },
    {
      icon: 'fas fa-user-graduate',
      label: 'Student Registration',
      route: '/registration/student',
      roles: ['Admin'],
    },
    {
      icon: 'fas fa-chalkboard-teacher',
      label: 'Teacher Registration',
      route: '/registration/teacher',
      roles: ['Admin'],
    },
    {
      icon: 'fas fa-user-tag',
      label: 'Assign Subjects',
      route: '/assign-teacher-subjects',
      roles: ['Admin'],
    },
    {
      icon: 'fas fa-file-alt',
      label: 'Create Exam',
      route: '/create/exam',
      roles: ['Admin', 'Teacher'],
    },
    {
      icon: 'fas fa-upload',
      label: 'Upload Answer Sheets',
      route: '/upload-answer-sheets',
      roles: ['Admin', 'Teacher'],
    },
    {
      icon: 'fas fa-chart-bar',
      label: 'Exam Results',
      route: '/results',
      roles: ['Admin', 'Teacher', 'Student'],
    },
    {
      icon: 'fas fa-key',
      label: 'Change Password',
      route: '/change-password',
      roles: ['Admin', 'Teacher', 'Student'],
    },
    {
      icon: 'fas fa-cog',
      label: 'Settings',
      route: '/admin-settings',
      roles: ['Admin'],
    },
  ];

  ngOnInit(): void {
    // Get user role
    this.userRole = this.authService.getUserRole();

    // ✅ NEW: Get user name and email
    this.userName = this.authService.getUserDisplayName();
    //this.userEmail = this.authService.getUserEmail();

    // Filter menu items based on role
    this.filterMenuByRole();
    this.subscribeToAcademicYear();
    this.loadAcademicYear();
  }

  ngOnDestroy(): void {
    this.academicYearSubscription?.unsubscribe();
  }
  
   // ✅ Subscribe to BehaviorSubject for INSTANT updates
  private subscribeToAcademicYear(): void {
    this.academicYearSubscription = this.masterDataService.academicYear$
      .subscribe(yearName => {
        if (yearName) {    
          this.currentAcademicYear = yearName;
        }
      });
  }

  
  // Filter menu items based on user role
  private filterMenuByRole(): void {
    if (!this.userRole) {
      this.visibleMenuItems = [];
      return;
    }

    // Show only menu items where user's role is included
    this.visibleMenuItems = this.allMenuItems.filter((item) =>
      item.roles.includes(this.userRole!),
    );
  }

  private loadAcademicYear(): void {
    this.isLoadingAcademicYear = true;

    this.masterDataService.getCurrentAcademicYear().subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.currentAcademicYear = 'No Active Year';
        }
        // BehaviorSubject handles the update
        this.isLoadingAcademicYear = false;
      },
      error: (error) => {    
        this.currentAcademicYear = 'Not Available';
        this.isLoadingAcademicYear = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
