import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ProfileService, UserProfile } from '../../../core/services/profile.service';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private authService  = inject(AuthService);
  private toast        = inject(ToastService);
  private errorHandler = inject(ErrorHandlerService);
  private fb           = inject(FormBuilder);

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

  checkStrength(password: string): void {
    this.requirements = {
      length: password.length >= 8,
      upper:  /[A-Z]/.test(password),
      lower:  /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(this.requirements).filter(Boolean).length;
    if (!password) { this.strength = 'none'; return; }
    if (score <= 2) this.strength = 'weak';
    else if (score <= 4) this.strength = 'medium';
    else this.strength = 'strong';
  }

  get strengthLabel(): string {
    return this.strength === 'none' ? '' : this.strength.charAt(0).toUpperCase() + this.strength.slice(1);
  }

  ngOnInit(): void {
    this.buildPasswordForm();
    this.loadProfile();
  }

  private loadProfile(): void {
    this.profileService.getProfile().subscribe({
      next:  (data) => { this.profile = data; this.isLoadingProfile = false; },
      error: (err)  => { this.isLoadingProfile = false; this.errorHandler.handle('Failed to load profile', err); },
    });
  }

  private buildPasswordForm(): void {
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword:     ['', [Validators.required, Validators.minLength(8),
                             Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.matchValidator });

    this.passwordForm.get('newPassword')?.valueChanges.subscribe(val => {
      this.checkStrength(val ?? '');
    });
  }

  private matchValidator(group: AbstractControl) {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np === cp ? null : { mismatch: true };
  }

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
    return this.touchedFields.has('confirmPassword') && !!this.passwordForm.errors?.['mismatch'];
  }

  onChangePassword(): void {
    ['oldPassword', 'newPassword', 'confirmPassword'].forEach(f => this.touchedFields.add(f));
    if (this.passwordForm.invalid) return;

    this.isChangingPassword = true;

    this.authService.changePassword(this.passwordForm.value).subscribe({
      next: (res) => {
        this.isChangingPassword = false;
        if (res.success) {
          this.toast.showSuccess('Success', 'Password changed! Redirecting to login...');
          this.passwordForm.reset();
          this.touchedFields.clear();
          this.strength = 'none';
          this.requirements = { length: false, upper: false, lower: false, number: false, symbol: false };
          this.showPasswordForm = false;
          // Invalidate local session — backend already revoked the token
          setTimeout(() => {
            this.authService.logoutLocal();
          }, 1500);
        } else {
          this.toast.showError('Error', res.message ?? 'Failed to change password');
        }
      },
      error: (err) => {
        this.isChangingPassword = false;
        this.toast.showError('Error', err?.error?.message ?? 'Current password is incorrect');
      },
    });
  }

  getInitials(): string {
    if (!this.profile) return '?';
    return `${this.profile.firstName[0]}${this.profile.lastName[0]}`.toUpperCase();
  }

  getFullName(): string {
    return this.profile ? `${this.profile.firstName} ${this.profile.lastName}` : '';
  }

  onLogout(): void { this.authService.logout(); }

  getFriendlyRole(): string {
  const roleMap: Record<string, string> = {
    'Admin':            'Admin',
    'SuperAdmin':       'Super Admin',
    'Teacher':          'Teacher',
    'Student':          'Student',
    'NonTeachingStaff': 'Non Teaching',  
  };
  return this.profile?.role 
    ? (roleMap[this.profile.role] ?? this.profile.role) 
    : '';
}
}