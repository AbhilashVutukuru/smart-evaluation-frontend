import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  error = '';
  success = false;
  invalidToken = false;
  token = '';
  schoolId=0;
  showPassword = false;
  showConfirmPassword = false;

  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
  ) {
    this.resetForm = this.fb.group(
      {
        resetToken: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        email: ['', [Validators.required, Validators.email]], // ✅ Added
        schoolId: [0, [Validators.required, Validators.min(1)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'] || '';
      const email = params['email'] || ''; // ✅ Extract from URL
      const schoolId = +params['schoolId'] || 0; // ✅ Extract from URL (convert to number)

      if (!token || !email || !schoolId) {
        this.invalidToken = true;
        this.error = 'Invalid reset link. Please check your email.';
      } else {
        // ✅ Patch all values into the form
        this.resetForm.patchValue({ 
          resetToken: token,
          email: email,
          schoolId: schoolId
        });
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
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
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
    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.resetPassword(this.resetForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = true;
          
        } else {
          this.error = response.message || 'Failed to reset password';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Network error. Please try again.';
        this.loading = false;
      },
    });
  }
}
