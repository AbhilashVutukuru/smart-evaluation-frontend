import { Component, ViewChild, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserMenuComponent } from '../user-menu/user-memu.component';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PageContextService } from '../../../core/services/page-context.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, UserMenuComponent, CommonModule],
  template: `
    <div class="layout">

      <!-- Sidebar -->
      <app-sidebar
        #sidebar
        (collapsedChange)="onSidebarCollapsed($event)"
      ></app-sidebar>

      <!-- Main content -->
      <div class="main-content" [class.collapsed]="sidebarCollapsed">

        <!-- Topbar -->
        <div class="topbar">
          <button class="hamburger-btn" (click)="openSidebar()" aria-label="Open menu">
            <i class="fas fa-bars"></i>
          </button>
          <div class="topbar-page-title">
            <i class="fas {{ pageIcon }}"></i>
            <span class="title-text">{{ pageTitle }}</span>
            <span *ngIf="pageContext.topbarSubtitle()" class="topbar-subtitle">
              ( {{ pageContext.topbarSubtitle() }} )
            </span>
          </div>
          <span class="topbar-title">School Portal</span>
          <div class="topbar-right">
            <app-user-menu></app-user-menu>
          </div>
        </div>

        <!-- Page content flush below topbar, same white bg -->
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    app-sidebar { flex-shrink: 0; }

    .main-content {
      flex: 1;
      margin-left: 260px;
      min-height: 100vh;
      transition: margin-left 0.3s ease;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: var(--app-bg);
    }

    .main-content.collapsed { margin-left: 70px; }

    /* ── Topbar ── */
    .topbar {
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      background: var(--app-bg);

      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 4rem;
      gap: 0.75rem;
    }

    .topbar-page-title {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 1.73rem;
      font-weight: 500;
      color: var(--gray-900);
      white-space: nowrap;
      letter-spacing: -0.01em;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .topbar-page-title i {
      color: var(--blue);
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .topbar-subtitle {
      font-size: 1rem;
      font-weight: 500;
      color: var(--green-dark);
      margin-left: 0.5rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .topbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    .hamburger-btn {
      display: none;
      width: 2.25rem;
      height: 2.25rem;
      background: var(--gray-100);
      border: none;
      border-radius: 8px;
      color: var(--gray-700);
      font-size: 1rem;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: var(--transition);
    }
    .hamburger-btn:hover { background: var(--gray-200); }

    .topbar-title {
      display: none;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--gray-900);
    }

    /* Page content — no extra background, no gap */
    .page-content {
      flex: 1;
      background: var(--app-bg);
    }

    @media (max-width: 767px) {
      .main-content,
      .main-content.collapsed {
        margin-left: 0 !important;
        width: 100%;
      }
      .hamburger-btn { display: flex; }
      .topbar-title  { display: none; }
      .topbar-page-title { display: flex; font-size: 1.1rem; }
      .topbar-page-title i { font-size: 1rem; }
      .topbar { padding: 0.625rem 1rem; border-bottom: 1px solid var(--gray-100); }
      .topbar-subtitle { font-size: 0.875rem; }
    }

    @media (max-width: 479px) {
      .topbar { padding: 0.5rem 0.875rem; gap: 0.5rem; }
      .topbar-page-title { font-size: 1rem; gap: 0.5rem; }
      .topbar-page-title i { font-size: 0.9rem; }
      .topbar-subtitle { display: none; }
      .hamburger-btn { width: 2rem; height: 2rem; font-size: 0.9rem; }
    }

    @media (max-width: 360px) {
      .topbar { padding: 0.5rem 0.625rem; gap: 0.375rem; }
      .topbar-page-title { font-size: 0.9rem; }
    }
  `],
})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = false;
  pageTitle = '';
  pageIcon = 'fa-tachometer-alt';


  // private readonly routeTitles: Record<string, string> = {
  //   // '/dashboard':            'Dashboard',
  //   // '/create/exam':          'Create Question Paper',
  //   // '/upload-answer-sheets': 'Upload Answer Sheets',
  //   // '/results':              'View Exam Results',
  //   // '/admin-settings':       'Settings',
  //   // '/profile':              'Profile',
  //   // '/change-password':      'Change Password',
  // };

  // private readonly routeIcons: Record<string, string> = {
  //   // '/dashboard':            'fa-tachometer-alt',
  //   // '/create/exam':          'fa-file-alt',
  //   // '/upload-answer-sheets': 'fa-cloud-upload-alt',
  //   // '/results':              'fa-chart-bar',
  //   // '/admin-settings':       'fa-cog',
  //   // '/profile':              'fa-user-circle',
  //   // '/change-password':      'fa-key',
  // };

  private readonly routePrefixes: Array<{ prefix: string; title: string; icon: string }> = [
    { prefix: '/dashboard',            title: 'Dashboard',                  icon: 'fa-tachometer-alt' },
    { prefix: '/view/exam',            title: 'View Question Papers',       icon: 'fa-file-alt' },
    { prefix: '/create/exam',          title: 'Create Question Paper',      icon: 'fa-file-alt' },
    { prefix: '/upload-answer-sheets', title: 'Upload Answer Sheets',       icon: 'fa-cloud-upload-alt' },
    { prefix: '/results',              title: 'View Exam Results',          icon: 'fa-chart-bar' },
    { prefix: '/admin-settings',       title: 'Settings',                   icon: 'fa-cog' },
    { prefix: '/profile',              title: 'Profile',                    icon: 'fa-user-circle' },
    { prefix: '/change-password',      title: 'Change Password',            icon: 'fa-key' },
    { prefix: '/students',             title: 'Students',                   icon: 'fa-user-graduate' },
    { prefix: '/teachers',             title: 'Teachers',                   icon: 'fa-chalkboard-teacher' },
    { prefix: '/non-teaching-staff',   title: 'Non-Teaching Staff', icon: 'fa-user-tie' },
    // { prefix: '/assign-subjects',           title: 'Assign Subjects to Teacher', icon: 'fa-chalkboard-teacher' },
    { prefix: '/assign-teacher-subjects', title: 'Assign Subjects to Teacher', icon: 'fa-chalkboard-teacher' },
    // { prefix: '/teacher-subjects',          title: 'Assign Subjects to Teacher', icon: 'fa-chalkboard-teacher' },
    { prefix: '/register-student',      title: 'Student Registration',       icon: 'fa-user-graduate' },
    { prefix: '/register-teacher',      title: 'Teacher Registration',       icon: 'fa-chalkboard-teacher' },
    { prefix: '/admin-settings',        title: 'Settings',                   icon: 'fa-cog' },
  ];

  // private resolveRoute(url: string): { title: string; icon: string } {
  //   const [path, query] = url.split('?');
  //   const params        = new URLSearchParams(query ?? '');
  //   const isEditMode    = params.get('mode') === 'edit';

  //   // Edit mode override — must come BEFORE exact/prefix match
  //   if (isEditMode && path.startsWith('/create/exam')) {
  //     return { title: 'Edit Question Paper', icon: 'fa-edit' };
  //   }
  //   // Exact match
  //   if (this.routeTitles[path]) {
  //     return { title: this.routeTitles[path], icon: this.routeIcons[path] ?? 'fa-circle' };
  //   }
  //   // Prefix match for dynamic routes
  //   const match = this.routePrefixes.find(r => path.startsWith(r.prefix));
  //   if (match) return { title: match.title, icon: match.icon };
  //   // Fallback
  //   return { title: this.titleFromUrl(path), icon: 'fa-layer-group' };
  // }

    private resolveRoute(url: string): { title: string; icon: string } {
    const [path, query] = url.split('?');
    const params        = new URLSearchParams(query ?? '');
    const isEditMode    = params.get('mode') === 'edit';

    // Edit mode override — must come BEFORE exact/prefix match
    if (isEditMode && path.startsWith('/create/exam')) {
      return { title: 'Edit Question Paper', icon: 'fa-edit' };
    }
    // Exact match via prefix (first entry wins, most specific prefixes listed first)
    const match = this.routePrefixes.find(r => path.startsWith(r.prefix));
    if (match) return { title: match.title, icon: match.icon };
    // Fallback
    return { title: this.titleFromUrl(path), icon: 'fa-layer-group' };
  }

  @ViewChild('sidebar') sidebar!: SidebarComponent;

  constructor(private router: Router, private authService: AuthService, public pageContext: PageContextService) {}

ngOnInit(): void {
  // Redirect NonTeachingStaff away from dashboard
  const role = this.authService.getUserRole();
  const currentUrl = this.router.url.split('?')[0];
  if (role === 'NonTeachingStaff' && currentUrl === '/dashboard') {
    this.router.navigate(['/create/exam']);
    return;
  }

  this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map((e: any) => e.urlAfterRedirects),
  ).subscribe(url => {
    const r = this.resolveRoute(url);
    this.pageTitle = r.title;
    this.pageIcon  = r.icon;
    this.pageContext.clearSubtitle();   // clear on every navigation
  });

  const url = this.router.url;               // full URL including ?mode=edit
  const r   = this.resolveRoute(url);
  this.pageTitle = r.title;
  this.pageIcon  = r.icon;
}

  private titleFromUrl(url: string): string {
    const last = url.split('/').filter(Boolean).pop() ?? '';
    return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = !!collapsed;
  }

  openSidebar(): void {
    this.sidebar?.openMobileSidebar();
  }
}