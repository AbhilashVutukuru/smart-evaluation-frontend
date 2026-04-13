import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserMenuComponent } from '../user-menu/user-memu.component';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, UserMenuComponent, CommonModule],
  template: `
    <div class="layout">

      <!-- Sidebar -->
      <app-sidebar
        #sidebar
        (collapsedChange)="onSidebarCollapsed($event)"
      ></app-sidebar>

      <!-- Main content -->
      <div class="main-content" [class.collapsed]="sidebarCollapsed">

        <!-- Topbar (desktop + mobile) -->
        <div class="topbar">
          <!-- Mobile: hamburger -->
          <button class="hamburger-btn" (click)="openSidebar()" aria-label="Open menu">
            <i class="fas fa-bars"></i>
          </button>

          <!-- Mobile: title -->
          <span class="topbar-title">School Portal</span>

          <!-- Right: user menu (always visible) -->
          <div class="topbar-right">
            <app-user-menu></app-user-menu>
          </div>
        </div>

        <router-outlet></router-outlet>
      </div>

    </div>
  `,
  styles: [`
    /* ── Shell layout ── */
    .layout {
      display: flex;
      min-height: 100vh;
    }

    app-sidebar { flex-shrink: 0; }

    /* ── Main content ── */
    .main-content {
      flex: 1;
      margin-left: 260px;
      background: #f4f6f9;
      min-height: 100vh;
      transition: margin-left 0.3s ease;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .main-content.collapsed { margin-left: 70px; }

    /* ── Topbar ── */
    .topbar {
      display: flex;
      align-items: center;
      padding: 0.625rem 1.5rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      min-height: 3.25rem;
    }

    /* Push user menu to far right */
    .topbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    /* Mobile: hamburger — hidden on desktop */
    .hamburger-btn {
      display: none;
      width: 2.25rem;
      height: 2.25rem;
      background: #f1f5f9;
      border: none;
      border-radius: 8px;
      color: #374151;
      font-size: 1rem;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
      margin-right: 0.75rem;
    }

    .hamburger-btn:hover { background: #e2e8f0; }

    /* Mobile: portal title — hidden on desktop */
    .topbar-title {
      display: none;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #111827;
    }

    /* ── Mobile ── */
    @media (max-width: 767px) {
      .main-content,
      .main-content.collapsed {
        margin-left: 0 !important;
        width: 100%;
      }

      .hamburger-btn { display: flex; }
      .topbar-title  { display: block; }

      .topbar {
        padding: 0.625rem 1rem;
      }
    }
  `],
})
export class LayoutComponent {
  sidebarCollapsed = false;

  @ViewChild('sidebar') sidebar!: SidebarComponent;

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = !!collapsed;
  }

  openSidebar(): void {
    this.sidebar?.openMobileSidebar();
  }
}