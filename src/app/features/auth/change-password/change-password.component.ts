import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {

  changePasswordForm: FormGroup;

  loading = false;
  error = '';
  success = '';

  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  passwordRequirements = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.changePasswordForm = this.fb.group(
      {
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator }
    );

    this.changePasswordForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.checkPasswordRequirements(value || '');
    });
  }

  get f() {
    return this.changePasswordForm.controls;
  }

  togglePassword(type: 'old' | 'new' | 'confirm') {
    if (type === 'old') this.showOldPassword = !this.showOldPassword;
    if (type === 'new') this.showNewPassword = !this.showNewPassword;
    if (type === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return newPassword === confirmPassword
      ? null
      : { passwordMismatch: true };
  }

  checkPasswordRequirements(password: string) {
    this.passwordRequirements.length = password.length >= 8;
    this.passwordRequirements.uppercase = /[A-Z]/.test(password);
    this.passwordRequirements.lowercase = /[a-z]/.test(password);
    this.passwordRequirements.number = /[0-9]/.test(password);
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      oldPassword: this.changePasswordForm.value.oldPassword,
      newPassword: this.changePasswordForm.value.newPassword
    };

    this.authService.changePassword(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = 'Password changed successfully';
          this.changePasswordForm.reset();
        } else {
          this.error = response.message || 'Failed to change password';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Network error. Please try again.';
        this.loading = false;
      }
    });
  }
}
