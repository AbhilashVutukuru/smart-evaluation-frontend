import { Component, OnInit, inject } from '@angular/core';
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
export class UnauthorizedComponent implements OnInit {
  private router    = inject(Router);
  private authService = inject(AuthService);

  readonly isStudentBlock: boolean =
    sessionStorage.getItem('unauthorizedReason') === 'student';

  // FIX: Snapshot values captured once in ngOnInit instead of live getters.
  // Live getters re-evaluate on every change detection cycle — wasteful.
  // Also: role is displayed as a readable label, not the raw internal string.
  userEmail    : string | null = null;
  userRole     : string | null = null;
  userRoleLabel: string | null = null;

  ngOnInit(): void {
    // FIX: Clear sessionStorage flag immediately on component init —
    // not inside goBack()/logout() where it can be forgotten if user
    // navigates away via browser back button instead of clicking a button.
    sessionStorage.removeItem('unauthorizedReason');

    this.userEmail     = this.authService.getUserEmail();
    this.userRole      = this.authService.getUserRole();
    // FIX: Show human-readable role label — never expose internal role strings
    // like "NonTeachingStaff" to the user. Map to friendly display names.
    this.userRoleLabel = this.getRoleLabel(this.userRole);
  }

  goBack(): void {
    if (this.isStudentBlock) {
      this.router.navigate(['/auth/login']);
    } else {
      // FIX: Navigate to dashboard only if authenticated.
      // If not authenticated (e.g. interceptor 403), send to login instead.
      this.authService.isAuthenticated()
        ? this.router.navigate(['/dashboard'])
        : this.router.navigate(['/auth/login']);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  // ─────────────────────────────────────────────────────────
  // Maps internal role strings to user-friendly display labels.
  // Internal role names (NonTeachingStaff, SuperAdmin etc.) must
  // never be shown directly — they reveal system internals.
  // ─────────────────────────────────────────────────────────
  private getRoleLabel(role: string | null): string | null {
    const roleMap: Record<string, string> = {
      SuperAdmin        : 'Super Administrator',
      Admin             : 'Administrator',
      Teacher           : 'Teacher',
      NonTeachingStaff  : 'Staff Member',
      Student           : 'Student',
    };
    return role ? (roleMap[role] ?? role) : null;
  }
}