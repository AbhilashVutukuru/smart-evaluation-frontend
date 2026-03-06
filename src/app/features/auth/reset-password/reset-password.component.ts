import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resetForm: FormGroup;
  loading = false;
  error = '';
  success = false;
  invalidToken = false;
  showPassword = false;
  showConfirmPassword = false;

  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  };

  constructor() {
    this.resetForm = this.fb.group(
      {
        resetToken: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        schoolId: [0, [Validators.required, Validators.min(1)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'] || '';
      const email = params['email'] || '';
      const schoolId = +params['schoolId'] || 0;

      if (!token || !email || !schoolId) {
        this.invalidToken = true;
        this.error = 'Invalid reset link. Please check your email.';
      } else {
        this.resetForm.patchValue({ resetToken: token, email, schoolId });
      }
    });

    this.resetForm.get('newPassword')?.valueChanges.subscribe((password) => {
      this.checkPasswordStrength(password);
    });
  }

  get f() {
    return this.resetForm.controls;
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  togglePassword(field: string): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  checkPasswordStrength(password: string): void {
    this.passwordRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
  }

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.error = '';

    this.authService.resetPassword(this.resetForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.success = true;
          // ✅ Clear any auth state so guard doesn't redirect to dashboard
          this.authService.logoutLocal();
          // ✅ Navigate after short delay so user sees success message
          setTimeout(() => this.router.navigate(['/auth/login']), 2500);
        } else {
          this.error = response.message || 'Failed to reset password';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Network error. Please try again.';
      },
    });
  }
}