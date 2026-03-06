import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  changePasswordForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isFirstTimeChange = false;

  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  };

  constructor() {
    this.changePasswordForm = this.fb.group(
      {
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );

    this.changePasswordForm
      .get('newPassword')
      ?.valueChanges.subscribe((password) => {
        this.checkPasswordStrength(password ?? '');
      });
  }

  ngOnInit(): void {
    this.isFirstTimeChange = this.router.url.includes('auth/change-password');
  }

  get f() {
    return this.changePasswordForm.controls;
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  togglePassword(field: string): void {
    if (field === 'old') this.showOldPassword = !this.showOldPassword;
    else if (field === 'new') this.showNewPassword = !this.showNewPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkPasswordStrength(password: string): void {
    this.passwordRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.changePassword(this.changePasswordForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.success = 'Password changed successfully! Redirecting to login…';
          this.changePasswordForm.reset();

          // ✅ Clear auth state so guard doesn't redirect to dashboard
          this.authService.logoutLocal();

          // ✅ Always navigate to login after password change
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        } else {
          this.error = response.message || 'Failed to change password';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to change password';
      },
    });
  }
}