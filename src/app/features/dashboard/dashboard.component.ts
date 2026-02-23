import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <!-- <p>Welcome back, {{ currentUser?.userName }}!</p> -->
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <i class="fas fa-user-graduate"></i>
          <h3>Total Students</h3>
          <p class="stat-number">1,234</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-chalkboard-teacher"></i>
          <h3>Total Teachers</h3>
          <p class="stat-number">56</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-file-alt"></i>
          <h3>Active Exams</h3>
          <p class="stat-number">12</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-check-circle"></i>
          <h3>Completed</h3>
          <p class="stat-number">89</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 40px;
    }
    .dashboard-header h1 {
      color: #1f2937;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .dashboard-header p {
      color: #6b7280;
      font-size: 1.1rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    .stat-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card i {
      font-size: 3rem;
      color: #6366f1;
      margin-bottom: 15px;
    }
    .stat-card h3 {
      color: #6b7280;
      font-size: 1rem;
      margin-bottom: 10px;
    }
    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);

  get currentUser() {
    return this.authService.currentUserValue;
  }
}
