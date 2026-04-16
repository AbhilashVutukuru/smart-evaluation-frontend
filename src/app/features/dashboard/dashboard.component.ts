import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary } from '../../core/models/dashboard-summary';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  summary: DashboardSummary | null = null;
  isLoading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.dashboardService.getSummary().subscribe({
      next: (data) => { this.summary = data; this.isLoading = false; },
      error: ()     => { this.error = 'Failed to load dashboard data.'; this.isLoading = false; },
    });
  }

  get isAdmin():   boolean { return this.summary?.role === 'Admin' || this.summary?.role === 'SuperAdmin'; }
  get isTeacher(): boolean { return this.summary?.role === 'Teacher'; }
  get isStudent(): boolean { return this.summary?.role === 'Student'; }

  getProgressWidth(value: number, total: number): string {
    if (!total) return '0%';
    return `${Math.min(Math.round((value / total) * 100), 100)}%`;
  }

  getScoreColor(percentage: number): string {
    if (percentage >= 75) return 'score-high';
    if (percentage >= 50) return 'score-mid';
    return 'score-low';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getBreakdownRowClass(evaluated: number, total: number): string {
    if (total === 0) return '';
    const pct = (evaluated / total) * 100;
    if (pct === 100) return 'row-complete';
    if (pct >= 50)   return 'row-partial';
    return 'row-low';
  }
}