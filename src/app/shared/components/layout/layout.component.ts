import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar (collapsedChange)="onSidebarCollapsed($event)"></app-sidebar>
      <div class="main-content" [class.collapsed]="sidebarCollapsed">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    app-sidebar {
      flex-shrink: 0;
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      background: #f5f5f5;
      min-height: 100vh;
      transition: margin-left 0.3s ease;
    }

    .main-content.collapsed {
      margin-left: 70px;
    }
  `],
})
export class LayoutComponent {
  sidebarCollapsed = false;

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = !!collapsed;
  }
}