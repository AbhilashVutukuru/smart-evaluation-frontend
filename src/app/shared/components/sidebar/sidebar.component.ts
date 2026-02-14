import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  private authService = inject(AuthService);

  menuItems = [
    { icon: 'fas fa-th-large', label: 'Dashboard', route: '/dashboard' },
    {
      icon: 'fas fa-user-graduate',
      label: 'Students',
      route: '/students/list',
    },
    {
      icon: 'fas fa-chalkboard-teacher',
      label: 'Teachers',
      route: '/teachers/list',
    },
    {
      icon: 'fas fa-user-graduate',
      label: 'Student Registration',
      route: '/registration/student',
    },
    {
      icon: 'fas fa-chalkboard-teacher',
      label: 'Teacher Registration',
      route: '/registration/teacher',
    },
    { icon: 'fas fa-user-tag', label: 'Assign Subjects', route: '/assign-teacher-subjects' },
    { icon: 'fas fa-file-alt', label: 'Create Exam', route: '/create/exam' },
        { icon: 'fas fa-upload', label: 'Upload Answer Sheets', route: '/upload-answer-sheets' },
    // { icon: 'fas fa-upload', label: 'Upload Docs', route: '/upload' },
    { icon: 'fas fa-chart-bar', label: 'Exam Results', route: '/results' },
    { icon: 'fas fa-key', label: 'Change Password', route: '/change-password' },
 
    { icon: 'fas fa-cog', label: 'Settings', route: '/admin-settings' },
  ];

  logout(): void {
    this.authService.logout();
  }
}
