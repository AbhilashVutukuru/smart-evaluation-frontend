import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  AbstractControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);

  // FIX: destroy$ prevents memory leaks — cancels all subscriptions on destroy
  private destroy$ = new Subject<void>();
  // FIX: tracks the auto-redirect timer so it can be cancelled on destroy
  private redirectTimer?: ReturnType<typeof setTimeout>;

  resetForm: FormGroup;
  loading             = false;
  error               = '';
  success             = false;
  invalidToken        = false;
  showPassword        = false;
  showConfirmPassword = false;

  passwordRequirements = {
    length   : false,
    uppercase: false,
    lowercase: false,
    number   : false,
  };

  // Computed: true only when ALL password requirements are met
  get allRequirementsMet(): boolean {
    return Object.values(this.passwordRequirements).every(Boolean);
  }

  constructor() {
    this.resetForm = this.fb.group(
      {
        resetToken      : ['', Validators.required],
        email           : ['', [Validators.required, Validators.email]],
        schoolId        : [0,  [Validators.required, Validators.min(1)]],
        newPassword     : ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword : ['', Validators.required],
      },
      // FIX: static validator reference — arrow fn avoids 'this' context issues
      { validators: (g: AbstractControl) => ResetPasswordComponent.passwordMatchValidator(g as FormGroup) },
    );
  }

  ngOnInit(): void {
    // FIX: take(1) — query params on a reset link never change after page load.
    // No need to keep this subscription alive for the component's lifetime.
    this.route.queryParams
      .pipe(take(1))
      .subscribe((params) => {
        const token    = params['token']    || '';
        const email    = params['email']    || '';
        const schoolId = +params['schoolId'] || 0;

        if (!token || !email || !schoolId) {
          this.invalidToken = true;
          // FIX: Generic error — don't tell attacker which param was missing
          this.error = 'This reset link is invalid or has expired. Please request a new one.';
        } else {
          this.resetForm.patchValue({ resetToken: token, email, schoolId });
        }
      });

    // FIX: takeUntil(destroy$) — unsubscribes when component is destroyed
    this.resetForm.get('newPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((password: string) => this.checkPasswordStrength(password ?? ''));
  }

  ngOnDestroy(): void {
    // FIX: cancel redirect timer if user navigates away before it fires
    clearTimeout(this.redirectTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.resetForm.controls; }

  // FIX: static method — passwordMatchValidator was an instance method called
  // as { validators: this.passwordMatchValidator } which loses 'this' context
  // inside the validator when called by Angular's form engine.
  private static passwordMatchValidator(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirm  = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  checkPasswordStrength(password: string): void {
    this.passwordRequirements = {
      length   : password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number   : /[0-9]/.test(password),
    };
  }

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.error   = '';

    this.authService.resetPassword(this.resetForm.value)
      .pipe(takeUntil(this.destroy$)) // FIX: cancel if component destroyed mid-request
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = true;
            // Clear any stale auth state so guard doesn't redirect to dashboard
            this.authService.logoutLocal();
            // FIX: store timer ref so it can be cancelled in ngOnDestroy
            this.redirectTimer = setTimeout(
              () => this.router.navigate(['/auth/login']), 2500);
          } else {
            // FIX: Generic message — never show server error detail to user
            this.error = 'Unable to reset password. The link may have expired. Please request a new one.';
          }
        },
        error: () => {
          // FIX: error object never used — generic message only, no internals leaked
          this.loading = false;
          this.error   = 'Network error. Please check your connection and try again.';
        },
      });
  }
}