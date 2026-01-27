import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
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
      {
        path: 'students/list',
        loadComponent: () =>
          import('./features/students/student-list/student-list.component').then(
            (m) => m.StudentListComponent,
          ),
      },
      {
        path: 'teachers/list',
        loadComponent: () =>
          import('./features/teachers/teacher-list/teacher-list.component').then(
            (m) => m.TeacherListComponent,
          ),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/auth/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'upload-answer-sheets',
        loadComponent: () =>
          import('./features/student-answers/upload-answer-sheets/upload-answer-sheets.component').then(
            (m) => m.UploadAnswerSheetsComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
