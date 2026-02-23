// unauthorized.component.ts
import { Component } from '@angular/core';
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
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  goBack(): void {
    // Go back to previous page or dashboard
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
  }

  get userEmail(): string | null {
    return this.authService.getUserEmail();
  }

  get userRole(): string | null {
    return this.authService.getUserRole();
  }
}