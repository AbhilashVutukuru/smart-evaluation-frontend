// unauthorized.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.css']
})
export class UnauthorizedComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  // Check if this is a student-login attempt (user never authenticated)
  readonly isStudentBlock: boolean =
    sessionStorage.getItem('unauthorizedReason') === 'student';

  get userEmail(): string | null {
    return this.authService.getUserEmail();
  }

  get userRole(): string | null {
    return this.authService.getUserRole();
  }

  goBack(): void {
    if (this.isStudentBlock) {
      sessionStorage.removeItem('unauthorizedReason');
      this.router.navigate(['/auth/login']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    sessionStorage.removeItem('unauthorizedReason');
    this.authService.logout();
  }
}