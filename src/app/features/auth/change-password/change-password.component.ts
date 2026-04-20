import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  AbstractControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);

  // FIX: destroy$ cancels subscriptions and redirect timer on destroy
  private destroy$      = new Subject<void>();
  private redirectTimer?: ReturnType<typeof setTimeout>;

  changePasswordForm: FormGroup;
  loading             = false;
  error               = '';
  success             = '';
  showOldPassword     = false;
  showNewPassword     = false;
  showConfirmPassword = false;
  isFirstTimeChange   = false;

  passwordRequirements = {
    length   : false,
    uppercase: false,
    lowercase: false,
    number   : false,
  };

  get allRequirementsMet(): boolean {
    return Object.values(this.passwordRequirements).every(Boolean);
  }

  constructor() {
    this.changePasswordForm = this.fb.group(
      {
        oldPassword    : ['', Validators.required],
        newPassword    : ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      // FIX: static validator via arrow fn — avoids 'this' context loss
      { validators: (g: AbstractControl) => ChangePasswordComponent.passwordMatchValidator(g as FormGroup) },
    );

    // FIX: moved here (constructor) so subscription starts before ngOnInit
    // but still needs takeUntil — add in ngOnInit when destroy$ is available
  }

  ngOnInit(): void {
    this.isFirstTimeChange = this.router.url.includes('/auth/change-password');

    // FIX: takeUntil — unsubscribes on destroy
    this.changePasswordForm.get('newPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((password: string) => this.checkPasswordStrength(password ?? ''));
  }

  ngOnDestroy(): void {
    clearTimeout(this.redirectTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.changePasswordForm.controls; }

  // FIX: static method — instance method loses 'this' when passed as validator reference
  private static passwordMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm  = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  togglePassword(field: 'old' | 'new' | 'confirm'): void {
    if (field === 'old')     this.showOldPassword     = !this.showOldPassword;
    else if (field === 'new')this.showNewPassword     = !this.showNewPassword;
    else                     this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkPasswordStrength(password: string): void {
    this.passwordRequirements = {
      length   : password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number   : /[0-9]/.test(password),
    };
  }

  goToLogin(): void {
    this.authService.logoutLocal();
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) return;

    this.loading = true;
    this.error   = '';
    this.success = '';

    this.authService.changePassword(this.changePasswordForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = 'Password changed successfully! Redirecting to login…';
            this.changePasswordForm.reset();
            this.authService.logoutLocal();
            // FIX: store timer ref so it can be cancelled in ngOnDestroy
            this.redirectTimer = setTimeout(
              () => this.router.navigate(['/auth/login']), 2000);
          } else {
            // FIX: never show server message to user
            this.error = 'Unable to change password. Please check your current password and try again.';
          }
        },
        error: () => {
          // FIX: generic message only — never expose error.error?.message
          this.loading = false;
          this.error   = 'An error occurred. Please try again.';
        },
      });
  }
}