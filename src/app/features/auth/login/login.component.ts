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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    // Restore remember me preference
    if (localStorage.getItem('rememberMePreference') === 'true') {
      this.loginForm.patchValue({ rememberMe: true });
    }

    // Already logged in → redirect
    if (this.authService.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate([returnUrl]);
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  clearError(): void {
    if (this.error) this.error = '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    localStorage.setItem(
      'rememberMePreference',
      this.loginForm.value.rememberMe.toString(),
    );

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        // ✅ Always reset loading before any navigation
        this.loading = false;

        if (response.success && response.data) {
          this.authService.updateCurrentUser(response.data);

          if (response.data.requirePasswordChange) {
            this.router.navigate(['/auth/change-password']);
          } else {
            const returnUrl =
              this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
            this.router.navigate([returnUrl]);
          }
        } else {
          this.error = response.message || 'Login failed';
        }
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 401) {
          this.error = 'Invalid email or password. Please try again.';
        } else if (error.status === 403) {
          // Student trying to log in — redirect to unauthorized page
          // Store a flag so unauthorized page knows why
          sessionStorage.setItem('unauthorizedReason', 'student');
          this.router.navigate(['/unauthorized']);
        } else if (error.status === 429) {
          this.error = 'Too many login attempts. Please try again later.';
        } else if (error.status === 0) {
          this.error = 'Network error. Please check your connection.';
        } else {
          this.error = error.error?.message || 'An error occurred. Please try again.';
        }
      },
    });
  }
}