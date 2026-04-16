// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { PdfViewerComponent } from './features/exams/pdf-viewer/pdf-viewer.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },

  // ============================================================
  // AUTH ROUTES (No Layout, No Guard)
  // ============================================================
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'auth/change-password',
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // ============================================================
  // UNAUTHORIZED ROUTE (No Layout, No Guard)
  // ============================================================
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent,
      ),
  },

  // ============================================================
  // PROTECTED ROUTES (With Layout + Auth Guard)
  // ============================================================
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      // ── Profile (includes change password) ──────────────────
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/auth/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      // ── Registration ────────────────────────────────────────
      {
        path: 'registration/student',
        loadComponent: () =>
          import('./features/registration/student-registration/student-registration.component').then(
            (m) => m.StudentRegistrationComponent,
          ),
      },
      {
        path: 'registration/teacher',
        loadComponent: () =>
          import('./features/registration/teacher-registration/teacher-registration.component').then(
            (m) => m.TeacherRegistrationComponent,
          ),
      },
      // ── Students ────────────────────────────────────────────
      {
        path: 'students/list',
        loadComponent: () =>
          import('./features/students/student-list/student-list.component').then(
            (m) => m.StudentListComponent,
          ),
      },
      {
        path: 'students/view/:id',
        data: { mode: 'view' },
        loadComponent: () =>
          import('./features/students/student-view-edit/student-view-edit.component').then(
            (m) => m.StudentViewEditComponent,
          ),
      },
      {
        path: 'students/edit/:id',
        data: { mode: 'edit' },
        loadComponent: () =>
          import('./features/students/student-view-edit/student-view-edit.component').then(
            (m) => m.StudentViewEditComponent,
          ),
      },
      // ── Teachers ────────────────────────────────────────────
      {
        path: 'teachers/list',
        loadComponent: () =>
          import('./features/teachers/teacher-list/teacher-list.component').then(
            (m) => m.TeacherListComponent,
          ),
      },
      {
        path: 'teachers/view/:id',
        data: { mode: 'view' },
        loadComponent: () =>
          import('./features/teachers/teacher-view-edit/teacher-view-edit.component').then(
            (m) => m.TeacherViewEditComponent,
          ),
      },
      {
        path: 'teachers/edit/:id',
        data: { mode: 'edit' },
        loadComponent: () =>
          import('./features/teachers/teacher-view-edit/teacher-view-edit.component').then(
            (m) => m.TeacherViewEditComponent,
          ),
      },
      {
        path: 'assign-teacher-subjects',
        loadComponent: () =>
          import('./features/teachers/assign-teacher-subjects/assign-teacher-subjects.component').then(
            (m) => m.AssignTeacherSubjectsComponent,
          ),
      },
      // ── Exams ───────────────────────────────────────────────
      {
        path: 'create/exam',
        loadComponent: () =>
          import('./features/exams/create-question-paper/create-question-paper.component').then(
            (m) => m.CreateExamComponent,
          ),
      },
      {
        path: 'view/exam',
        loadComponent: () =>
          import('./features/exams/view-question-paper/view-question-paper.component').then(
            (m) => m.ViewQuestionPaperComponent,
          ),
      },
      {
        path: 'upload-answer-sheets',
        loadComponent: () =>
          import('./features/exams/upload-answer-sheet/upload-answer-sheet.component').then(
            (m) => m.UploadAnswerSheetsComponent,
          ),
      },
      {
        path: 'results',
        loadComponent: () =>
          import('./features/exams/exam-result/exam-result.component').then(
            (m) => m.ExamResultsComponent,
          ),
      },
      // ── Admin ───────────────────────────────────────────────
      {
        path: 'admin-settings',
        loadComponent: () =>
          import('./features/admin/admin-settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
      },
    ],
  },

  // ============================================================
  // PDF VIEWER (No Layout — no sidebar, no guard needed)
  // ============================================================
  {
    path: 'view-pdf',
    component: PdfViewerComponent,
  },

  // ============================================================
  // WILDCARD ROUTE (Fallback)
  // ============================================================
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];