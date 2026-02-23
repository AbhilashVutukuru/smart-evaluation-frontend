// login.component.ts - Updated for HttpOnly Cookies
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],  // ✅ Already has Remember Me!
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

onSubmit(): void {
  if (this.loginForm.invalid) return;

  this.loading = true;
  this.error = '';

  this.authService.login(this.loginForm.value).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        console.log('✅ Login successful');
        
        // ✅ Update user state from response (NOT from new API call!)
        this.authService.updateCurrentUser({
          requirePasswordChange: response.data.requirePasswordChange,
          accessToken: '',
          refreshToken: '',
          userId: response.data.userId,
          email: response.data.email,
          role: response.data.role,
          schoolId: response.data.schoolId,
          success: false
        });

        // Navigate
        if (response.data.requirePasswordChange) {
          this.router.navigate(['/auth/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
      this.loading = false;
    },
    error: (error) => {
      this.error = error.error?.message || 'Login failed';
      this.loading = false;
    }
  });
}
}