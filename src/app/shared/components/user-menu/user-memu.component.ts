import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.css'],
})
export class UserMenuComponent implements OnInit {
  private authService = inject(AuthService);

  userName: string | null = null;
  userRole: string | null = null;
  isOpen = false;

  ngOnInit(): void {
    this.userName = this.authService.getUserDisplayName();
    this.userRole = this.getFriendlyRole();;
  }

  toggleDropdown(): void { this.isOpen = !this.isOpen; }
  close(): void { this.isOpen = false; }

  logout(): void {
    this.close();
    this.authService.logout();
  }

  getFriendlyRole(): string {
    const role = this.authService.getUserRole();
    const roleMap: Record<string, string> = {
      'Admin': 'Admin',
      'SuperAdmin': 'Super Admin',
      'Teacher': 'Teacher',
      'Student': 'Student',
      'NonTeachingStaff': 'Non Teaching',
    };
    return role ? (roleMap[role] ?? role) : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }
}