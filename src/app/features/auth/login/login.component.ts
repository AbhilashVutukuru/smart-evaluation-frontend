// login.component.ts - FINAL VERSION with Remember Me Checkbox Persistence

import { Component, OnInit } from '@angular/core';
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
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    const savedRememberMe = localStorage.getItem('rememberMePreference');
    if (savedRememberMe === 'true') {
      this.loginForm.patchValue({ rememberMe: true });
    }

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

  // ✅ Clear error when user starts typing
  clearError(): void {
    if (this.error) {
      this.error = '';
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    localStorage.setItem('rememberMePreference', this.loginForm.value.rememberMe.toString());

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.authService.updateCurrentUser(response.data);

          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          
          if (response.data.requirePasswordChange) {
            this.router.navigate(['/auth/change-password']);
          } else {
            this.router.navigate([returnUrl]);
          }
        } else {
          this.error = response.message || 'Login failed';
        }
        this.loading = false;
      },
      error: (error) => {
        if (error.status === 401) {
          this.error = 'Invalid email or password';
        } else if (error.status === 403) {
          this.error = 'Your account has been suspended';
        } else if (error.status === 0) {
          this.error = 'Network error. Please check your connection.';
        } else if (error.status === 429) {
          this.error = 'Too many login attempts. Please try again later.';
        } else {
          this.error = error.error?.message || 'An error occurred. Please try again.';
        }
        this.loading = false;
      },
    });
  }
}
