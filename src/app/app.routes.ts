import { Routes } from '@angular/router';
import { PreloadAllModules } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { PdfViewerComponent } from './features/exams/pdf-viewer/pdf-viewer.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },

  // ============================================================
  // AUTH ROUTES — no layout, no guard
  // ============================================================
  {
    path: 'auth/login',
    title: 'Sign In - Indowest',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    // FIX: change-password must be guarded — only authenticated users who need
    // to change their password should reach this page. Without the guard an
    // anonymous user can browse to /auth/change-password directly.
    path: 'auth/change-password',
    title: 'Change Password - Indowest',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then(
        m => m.ChangePasswordComponent),
  },
  {
    path: 'auth/forgot-password',
    title: 'Forgot Password - Indowest',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    title: 'Reset Password - Indowest',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent),
  },

  // ============================================================
  // UNAUTHORIZED — no layout, no guard
  // ============================================================
  {
    path: 'unauthorized',
    title: 'Access Denied - Indowest',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        m => m.UnauthorizedComponent),
  },

  // ============================================================
  // PROTECTED ROUTES — layout + auth guard
  // ============================================================
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard - Indowest',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // ── Profile ─────────────────────────────────────────────
      {
        path: 'profile',
        title: 'My Profile - Indowest',
        loadComponent: () =>
          import('./features/auth/profile/profile.component').then(m => m.ProfileComponent),
      },

      // ── Registration ─────────────────────────────────────────
      // FIX: roleGuard applied — only Admin/SuperAdmin can register students/teachers
      {
        path: 'registration/student',
        title: 'Register Student - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/registration/student-registration/student-registration.component').then(
            m => m.StudentRegistrationComponent),
      },
      {
        path: 'registration/teacher',
        title: 'Register Teacher - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/registration/teacher-registration/teacher-registration.component').then(
            m => m.TeacherRegistrationComponent),
      },

      // ── Students ─────────────────────────────────────────────
      {
        path: 'students/list',
        title: 'Students - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher'])],
        loadComponent: () =>
          import('./features/students/student-list/student-list.component').then(
            m => m.StudentListComponent),
      },
      {
        path: 'students/view/:id',
        title: 'View Student - Indowest',
        data: { mode: 'view' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher'])],
        loadComponent: () =>
          import('./features/students/student-view-edit/student-view-edit.component').then(
            m => m.StudentViewEditComponent),
      },
      {
        path: 'students/edit/:id',
        title: 'Edit Student - Indowest',
        data: { mode: 'edit' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/students/student-view-edit/student-view-edit.component').then(
            m => m.StudentViewEditComponent),
      },

      // ── Teachers ─────────────────────────────────────────────
      {
        path: 'teachers/list',
        title: 'Teachers - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/teachers/teacher-list/teacher-list.component').then(
            m => m.TeacherListComponent),
      },
      {
        path: 'teachers/view/:id',
        title: 'View Teacher - Indowest',
        data: { mode: 'view' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/teachers/teacher-view-edit/teacher-view-edit.component').then(
            m => m.TeacherViewEditComponent),
      },
      {
        path: 'teachers/edit/:id',
        title: 'Edit Teacher - Indowest',
        data: { mode: 'edit' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/teachers/teacher-view-edit/teacher-view-edit.component').then(
            m => m.TeacherViewEditComponent),
      },
      {
        path: 'assign-teacher-subjects',
        title: 'Assign Subjects - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/teachers/assign-teacher-subjects/assign-teacher-subjects.component').then(
            m => m.AssignTeacherSubjectsComponent),
      },

      // ── Non-Teaching Staff ───────────────────────────────────
      {
        path: 'non-teaching-staff/list',
        title: 'Staff List - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/non-teaching-staff/non-teaching-list/non-teaching-list.component').then(
            m => m.NonTeachingListComponent),
      },
      {
        path: 'non-teaching-staff/register',
        title: 'Register Staff - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/registration/non-teaching-registration/non-teaching-registration.component').then(
            m => m.NonTeachingRegistrationComponent),
      },
      {
        path: 'non-teaching-staff/view/:id',
        title: 'View Staff - Indowest',
        data: { mode: 'view' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/non-teaching-staff/non-teaching-view-edit/non-teaching-view-edit.component').then(
            m => m.NonTeachingViewEditComponent),
      },
      {
        path: 'non-teaching-staff/edit/:id',
        title: 'Edit Staff - Indowest',
        data: { mode: 'edit' },
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/non-teaching-staff/non-teaching-view-edit/non-teaching-view-edit.component').then(
            m => m.NonTeachingViewEditComponent),
      },

      // ── Exams ────────────────────────────────────────────────
      {
        path: 'create/exam',
        title: 'Create Exam - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher', 'NonTeachingStaff'])],
        loadComponent: () =>
          import('./features/exams/create-question-paper/create-question-paper.component').then(
            m => m.CreateExamComponent),
      },
      {
        path: 'view/exam',
        title: 'View Exam - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher', 'NonTeachingStaff'])],
        loadComponent: () =>
          import('./features/exams/view-question-paper/view-question-paper.component').then(
            m => m.ViewQuestionPaperComponent),
      },
      {
        path: 'upload-answer-sheets',
        title: 'Upload Answer Sheets - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher', 'NonTeachingStaff'])],
        loadComponent: () =>
          import('./features/exams/upload-answer-sheet/upload-answer-sheet.component').then(
            m => m.UploadAnswerSheetsComponent),
      },
      {
        path: 'results',
        title: 'Exam Results - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin', 'Teacher'])],
        loadComponent: () =>
          import('./features/exams/exam-result/exam-result.component').then(
            m => m.ExamResultsComponent),
      },

      // ── Admin ────────────────────────────────────────────────
      {
        path: 'admin-settings',
        title: 'Admin Settings - Indowest',
        canActivate: [roleGuard(['Admin', 'SuperAdmin'])],
        loadComponent: () =>
          import('./features/admin/admin-settings/admin-settings.component').then(
            m => m.AdminSettingsComponent),
      },
    ],
  },

  // ============================================================
  // PDF VIEWER — no layout
  // FIX: guarded — unauthenticated users should not view answer sheet PDFs
  // ============================================================
  {
    path: 'view-pdf',
    title: 'View PDF',
    canActivate: [authGuard],
    component: PdfViewerComponent,
  },

  // ============================================================
  // WILDCARD
  // ============================================================
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];