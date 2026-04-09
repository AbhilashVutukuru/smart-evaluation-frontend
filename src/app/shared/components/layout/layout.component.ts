import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  template: `
    <div class="layout">

      <!-- Sidebar -->
      <app-sidebar
        #sidebar
        (collapsedChange)="onSidebarCollapsed($event)"
      ></app-sidebar>

      <!-- Main content -->
      <div class="main-content" [class.collapsed]="sidebarCollapsed">

        <!-- Mobile top bar (hamburger) -->
        <div class="mobile-topbar">
          <button class="hamburger-btn" (click)="openSidebar()" aria-label="Open menu">
            <i class="fas fa-bars"></i>
          </button>
          <span class="topbar-title">School Portal</span>
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

    app-sidebar {
      flex-shrink: 0;
    }

    /* ── Main content — offset by sidebar width ── */
    .main-content {
      flex: 1;
      margin-left: 260px;
      background: #f5f5f5;
      min-height: 100vh;
      transition: margin-left 0.3s ease;
      min-width: 0;
    }

    .main-content.collapsed {
      margin-left: 70px;
    }

    /* ── Mobile topbar (hidden on desktop) ── */
    .mobile-topbar {
      display: none;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: linear-gradient(135deg, #0ea4f4 0%, #0882c4 100%);
      border-bottom: none;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(8, 130, 196, 0.3);
    }

    .hamburger-btn {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .hamburger-btn:hover { background: rgba(255, 255, 255, 0.3); }

    .topbar-title {
      font-size: 1rem;
      font-weight: 600;
      color: white;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Mobile breakpoint ── */
    @media (max-width: 767px) {
      /* Show the topbar */
      .mobile-topbar {
        display: flex;
      }

      /* Content takes full width — sidebar is a drawer overlay */
      .main-content,
      .main-content.collapsed {
        margin-left: 0 !important;
        width: 100%;
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