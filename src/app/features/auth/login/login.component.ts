import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnquiryService } from '../../../core/services/enquiry.service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BaseComponent } from '../../../core/base/base.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent extends BaseComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private enquiryService = inject(EnquiryService);

  loginForm: FormGroup;
  enquiryForm: FormGroup;
  loading          = false;
  error            = '';
  showPassword     = false;
  alreadyLoggedIn  = false;
  loggedInUserName = '';
  showEnquiryModal = false;
  enquiryLoading   = false;
  enquiryError     = '';
  enquirySuccess   = false;

  constructor() {
    super();
    this.loginForm = this.fb.group({
      email     : ['', [Validators.required, Validators.email]],
      password  : ['', Validators.required],
      rememberMe: [false],
    });

    this.enquiryForm = this.fb.group({
      contactPersonName: ['', [Validators.required, Validators.minLength(2)]],
      email           : ['', [Validators.required, Validators.email]],
      phoneNumber     : ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      instituteName   : ['', Validators.required],
      instituteType   : ['', Validators.required],
      websiteUrl      : ['', [Validators.pattern(/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i)]],
      address         : ['', Validators.required],
      townOrCity      : ['', Validators.required],
      state           : ['', Validators.required],
      numberOfStudents: ['', [Validators.required, Validators.min(1)]],
      message         : ['', Validators.minLength(10)],
    });
  }

  ngOnInit(): void {
    // Restore remember me checkbox
    const remembered = localStorage.getItem('rememberMePreference') === 'true';
    if (remembered) {
      this.loginForm.patchValue({ rememberMe: true });
    }

    // Restore saved email if remember me was checked last time
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (remembered && savedEmail) {
      this.loginForm.patchValue({ email: savedEmail });
    }

    if (this.authService.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate([returnUrl]);
    }
  }

  get f() { return this.loginForm.controls; }
  get ef() { return this.enquiryForm.controls; }

  togglePassword(): void { this.showPassword = !this.showPassword; }
  clearError(): void     { if (this.error) this.error = ''; }

  openEnquiryModal(): void {
    this.showEnquiryModal = true;
    this.enquiryError = '';
    this.enquirySuccess = false;
    this.enquiryForm.reset();
  }

  closeEnquiryModal(): void {
    this.showEnquiryModal = false;
    this.enquiryForm.reset();
    this.enquiryError = '';
    this.enquirySuccess = false;
  }

 submitEnquiry(): void {
  if (this.enquiryForm.invalid) return;

  this.enquiryLoading = true;
  this.enquiryError = '';
  this.enquirySuccess = false;

  const formValue = this.enquiryForm.value;

  const payload = {
    instituteName    : formValue.instituteName,
    state            : formValue.state,
    townOrCity       : formValue.townOrCity,
    address          : formValue.address,
    contactPersonName: formValue.contactPersonName,
    email            : formValue.email,
    phoneNumber      : formValue.phoneNumber,
    numberOfStudents : Number(formValue.numberOfStudents),
    instituteType    : formValue.instituteType,
    websiteUrl       : formValue.websiteUrl || null,
    message          : formValue.message || '',
  };

  this.enquiryService
    .submitEnquiry(payload)
    .pipe(this.cancelOnDestroy())
    .subscribe({
      next: () => {
        this.enquiryLoading = false;
        this.enquirySuccess = true;
        this.enquiryForm.reset();

        // Close modal after 3 seconds
        // setTimeout(() => this.closeEnquiryModal(), 3000);
      },
      error: (error) => {
        this.enquiryLoading = false;

        if (error.status === 400) {
          this.enquiryError = 'Please check all fields and try again.';
        } else if (error.status === 0) {
          this.enquiryError = 'Network error. Please check your connection.';
        } else {
          this.enquiryError = 'Something went wrong. Please try again.';
        }
      },
    });
}

  goToDashboard(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigate([returnUrl]);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error   = '';

    const rememberMe = this.loginForm.value.rememberMe;
    localStorage.setItem('rememberMePreference', rememberMe.toString());

    // Save email when remember me is checked, clear it when unchecked
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', this.loginForm.value.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    this.authService
      .login(this.loginForm.value)
      .pipe(this.cancelOnDestroy())
      .subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success && response.data) {
            this.authService.updateCurrentUser(response.data);

            if (response.data.requirePasswordChange) {
              this.router.navigate(['/auth/change-password']);
              return;
            }

            const savedUrl  = sessionStorage.getItem('postLoginRedirect');
            const returnUrl = savedUrl || this.route.snapshot.queryParams['returnUrl'];
            sessionStorage.removeItem('postLoginRedirect');

            if (returnUrl) {
              this.router.navigate([returnUrl]);
            } else if (response.data.role === 'NonTeachingStaff') {
              this.router.navigate(['/create/exam']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.error = 'Login failed. Please try again.';
          }
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 401) {
            this.error = 'Invalid email or password. Please try again.';
          } else if (error.status === 403) {
            sessionStorage.setItem('unauthorizedReason', 'student');
            this.router.navigate(['/unauthorized']);
          } else if (error.status === 429) {
            this.error = 'Too many login attempts. Please try again later.';
          } else if (error.status === 0) {
            this.error = 'Network error. Please check your connection.';
          } else {
            this.error = 'An error occurred. Please try again.';
          }
        },
      });
  }
}