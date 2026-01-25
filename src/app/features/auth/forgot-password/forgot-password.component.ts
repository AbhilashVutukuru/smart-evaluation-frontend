import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  error = '';
  success = false;
  emailSent = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotForm.controls; }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.forgotPassword(this.forgotForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.emailSent = this.forgotForm.value.email;
          this.success = true;
        } else {
          this.error = response.message || 'Failed to send reset link';
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
