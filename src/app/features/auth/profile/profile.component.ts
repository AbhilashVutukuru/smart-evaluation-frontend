import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService }    from '../../../core/services/auth.service';
import { ToastService }   from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ProfileService, UserProfile } from '../../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private authService    = inject(AuthService);
  private toast          = inject(ToastService);
  private errorHandler   = inject(ErrorHandlerService);
  private fb             = inject(FormBuilder);

  // FIX: destroy$ cancels all subscriptions and the redirect timer on destroy
  private destroy$       = new Subject<void>();
  private redirectTimer?: ReturnType<typeof setTimeout>;

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile: UserProfile | null = null;
  isLoadingProfile = true;

  // ─── Change Password ──────────────────────────────────────────────────────
  passwordForm!: FormGroup;
  isChangingPassword = false;
  showPasswordForm   = false;
  showCurrent = false;
  showNew     = false;
  showConfirm = false;
  touchedFields = new Set<string>();

  // ─── Password Strength ────────────────────────────────────────────────────
  strength: 'none' | 'weak' | 'medium' | 'strong' = 'none';
  requirements = { length: false, upper: false, lower: false, number: false, symbol: false };

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildPasswordForm();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    clearTimeout(this.redirectTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Profile
  // ─────────────────────────────────────────────────────────────────────────

  private loadProfile(): void {
    this.profileService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (data) => { this.profile = data; this.isLoadingProfile = false; },
        // FIX: generic error — never expose err details to user
        error: ()     => { this.isLoadingProfile = false; this.errorHandler.handle('Failed to load profile'); },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Form
  // ─────────────────────────────────────────────────────────────────────────

  private buildPasswordForm(): void {
    this.passwordForm = this.fb.group({
      oldPassword    : ['', Validators.required],
      newPassword    : ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
      ]],
      confirmPassword: ['', Validators.required],
    // FIX: static validator via arrow fn — instance method loses 'this' when
    // passed as a validator reference and Angular calls it without context
    }, { validators: (g: AbstractControl) => ProfileComponent.matchValidator(g as FormGroup) });

    // FIX: takeUntil — unsubscribes when component is destroyed
    this.passwordForm.get('newPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => this.checkStrength(val ?? ''));
  }

  // FIX: static — no 'this' dependency, safe to use as a validator
  private static matchValidator(group: FormGroup) {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np === cp ? null : { mismatch: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Strength
  // ─────────────────────────────────────────────────────────────────────────

  checkStrength(password: string): void {
    this.requirements = {
      length: password.length >= 8,
      upper : /[A-Z]/.test(password),
      lower : /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(this.requirements).filter(Boolean).length;
    if (!password)    { this.strength = 'none';   return; }
    if (score <= 2)     this.strength = 'weak';
    else if (score <= 4) this.strength = 'medium';
    else                this.strength = 'strong';
  }

  get strengthLabel(): string {
    return this.strength === 'none'
      ? ''
      : this.strength.charAt(0).toUpperCase() + this.strength.slice(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form helpers
  // ─────────────────────────────────────────────────────────────────────────

  onBlur(field: string): void { this.touchedFields.add(field); }

  showError(field: string): boolean {
    return this.touchedFields.has(field) && !!this.passwordForm.get(field)?.invalid;
  }

  getError(field: string): string {
    const e = this.passwordForm.get(field)?.errors;
    if (!e) return '';
    if (e['required'])  return 'Required';
    if (e['minlength']) return `Minimum ${e['minlength'].requiredLength} characters`;
    if (e['pattern'])   return 'Must include uppercase, lowercase, number and symbol';
    return '';
  }

  get confirmMismatch(): boolean {
    return this.touchedFields.has('confirmPassword') &&
           !!this.passwordForm.errors?.['mismatch'];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Change Password submit
  // ─────────────────────────────────────────────────────────────────────────

  onChangePassword(): void {
    ['oldPassword', 'newPassword', 'confirmPassword'].forEach(f => this.touchedFields.add(f));
    if (this.passwordForm.invalid) return;

    this.isChangingPassword = true;

    this.authService.changePassword(this.passwordForm.value)
      .pipe(takeUntil(this.destroy$)) // FIX: cancel if component destroyed mid-request
      .subscribe({
        next: (res) => {
          this.isChangingPassword = false;
          if (res.success) {
            this.toast.showSuccess('Success', 'Password changed! Redirecting to login...');
            this.resetPasswordForm();
            // FIX: store timer ref — cleared in ngOnDestroy if user navigates away
            this.redirectTimer = setTimeout(() => this.authService.logoutLocal(), 1500);
          } else {
            // FIX: generic message — never expose server message to user
            this.toast.showError('Error', 'Unable to change password. Please check your current password.');
          }
        },
        error: () => {
          // FIX: no err?.error?.message — always generic
          this.isChangingPassword = false;
          this.toast.showError('Error', 'An error occurred. Please try again.');
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Display helpers
  // ─────────────────────────────────────────────────────────────────────────

  getInitials(): string {
    if (!this.profile) return '?';
    // FIX: guard against empty first/last name to prevent runtime crash
    const f = this.profile.firstName?.[0] ?? '';
    const l = this.profile.lastName?.[0]  ?? '';
    return (f + l).toUpperCase() || '?';
  }

  getFullName(): string {
    return this.profile
      ? `${this.profile.firstName} ${this.profile.lastName}`.trim()
      : '';
  }

  onLogout(): void { this.authService.logout(); }

  // FIX: "Non Teaching" → "Staff Member" — never expose internal role strings
  getFriendlyRole(): string {
    const roleMap: Record<string, string> = {
      Admin           : 'Administrator',
      SuperAdmin      : 'Super Administrator',
      Teacher         : 'Teacher',
      NonTeachingStaff: 'Staff Member',
      Student         : 'Student',
    };
    return this.profile?.role
      ? (roleMap[this.profile.role] ?? this.profile.role)
      : '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private resetPasswordForm(): void {
    this.passwordForm.reset();
    this.touchedFields.clear();
    this.strength     = 'none';
    this.requirements = { length: false, upper: false, lower: false, number: false, symbol: false };
    this.showPasswordForm = false;
    this.showCurrent = false;
    this.showNew     = false;
    this.showConfirm = false;
  }
}