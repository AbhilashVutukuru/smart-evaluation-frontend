import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();

  loginForm: FormGroup;
  loading          = false;
  error            = '';
  showPassword     = false;
  alreadyLoggedIn  = false;
  loggedInUserName = '';

  constructor() {
    this.loginForm = this.fb.group({
      email     : ['', [Validators.required, Validators.email]],
      password  : ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    if (localStorage.getItem('rememberMePreference') === 'true') {
      this.loginForm.patchValue({ rememberMe: true });
    }

    if (this.authService.isAuthenticated()) {
      this.alreadyLoggedIn  = true;
      this.loggedInUserName =
        this.authService.getUserEmail() ??
        this.authService.getUserDisplayName() ??
        'another account';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.loginForm.controls; }

  togglePassword(): void { this.showPassword = !this.showPassword; }
  clearError(): void     { if (this.error) this.error = ''; }

  goToDashboard(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigate([returnUrl]);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error   = '';

    localStorage.setItem('rememberMePreference', this.loginForm.value.rememberMe.toString());

    this.authService
      .login(this.loginForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success && response.data) {
            this.authService.updateCurrentUser(response.data);

            if (response.data.requirePasswordChange) {
              this.router.navigate(['/auth/change-password']);
              return;
            }

            // Redirect priority:
            // 1. postLoginRedirect (sessionStorage) — resume work after idle logout
            // 2. returnUrl (query param)            — auth guard redirect
            // 3. role-based default                 — fresh login
            const savedUrl  = sessionStorage.getItem('postLoginRedirect');
            const returnUrl = savedUrl || this.route.snapshot.queryParams['returnUrl'];
            sessionStorage.removeItem('postLoginRedirect');

            if (returnUrl) {
              this.router.navigate([returnUrl]);
            } else if (response.data.role === 'NonTeachingStaff') {
              this.router.navigate(['/create/exam']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          } else {
            // FIX: never expose server message — always generic
            this.error = 'Login failed. Please try again.';
          }
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 401) {
            this.error = 'Invalid email or password. Please try again.';
          } else if (error.status === 403) {
            sessionStorage.setItem('unauthorizedReason', 'student');
            this.router.navigate(['/unauthorized']);
          } else if (error.status === 429) {
            this.error = 'Too many login attempts. Please try again later.';
          } else if (error.status === 0) {
            this.error = 'Network error. Please check your connection.';
          } else {
            // FIX: never expose error.error?.message — always generic
            this.error = 'An error occurred. Please try again.';
          }
        },
      });
  }
}