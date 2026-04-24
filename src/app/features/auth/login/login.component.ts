import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent extends BaseComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  loginForm: FormGroup;
  loading          = false;
  error            = '';
  showPassword     = false;
  alreadyLoggedIn  = false;
  loggedInUserName = '';

  constructor() {
    super();
    this.loginForm = this.fb.group({
      email     : ['', [Validators.required, Validators.email]],
      password  : ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    // Restore remember me checkbox
    const remembered = localStorage.getItem('rememberMePreference') === 'true';
    if (remembered) {
      this.loginForm.patchValue({ rememberMe: true });
    }

    // Restore saved email if remember me was checked last time
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (remembered && savedEmail) {
      this.loginForm.patchValue({ email: savedEmail });
    }

    if (this.authService.isAuthenticated()) {
      this.alreadyLoggedIn  = true;
      this.loggedInUserName =
        this.authService.getUserEmail() ??
        this.authService.getUserDisplayName() ??
        'another account';
    }
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

    const rememberMe = this.loginForm.value.rememberMe;
    localStorage.setItem('rememberMePreference', rememberMe.toString());

    // Save email when remember me is checked, clear it when unchecked
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', this.loginForm.value.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    this.authService
      .login(this.loginForm.value)
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success && response.data) {
            this.authService.updateCurrentUser(response.data);

            if (response.data.requirePasswordChange) {
              this.router.navigate(['/auth/change-password']);
              return;
            }

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
            this.error = 'An error occurred. Please try again.';
          }
        },
      });
  }
}