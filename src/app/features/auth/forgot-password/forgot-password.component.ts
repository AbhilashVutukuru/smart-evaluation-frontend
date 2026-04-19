import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnDestroy {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);

  // FIX: destroy$ cancels subscription if user navigates away mid-request
  private destroy$ = new Subject<void>();

  forgotForm: FormGroup;
  loading   = false;
  error     = '';
  success   = false;
  // FIX: emailSent stores a snapshot — not live from the form which could be cleared
  emailSent = '';

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.forgotForm.controls; }

  onSubmit(): void {
    if (this.forgotForm.invalid) return;

    this.loading = true;
    this.error   = '';

    // Snapshot email before the request — form could theoretically be reset mid-flight
    const submittedEmail = this.forgotForm.value.email as string;

    this.authService.forgotPassword(this.forgotForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.emailSent = submittedEmail;
            this.success   = true;
          } else {
            // FIX: never show server message — always generic
            // Also: always show success-like message to prevent email enumeration
            // (attacker must not know whether the email exists)
            this.emailSent = submittedEmail;
            this.success   = true;
          }
        },
        error: () => {
          // FIX: on any error still show "success" UI — prevents email enumeration.
          // If we show an error only when the email doesn't exist, attacker learns which
          // emails are registered. Always show the same "check your email" message.
          this.loading   = false;
          this.emailSent = submittedEmail;
          this.success   = true;
        }
      });
  }
}