import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  firstName:    string;
  lastName:     string;
  email:        string;
  phoneNumber:  string;
  role:         string;
  schoolName:   string;
  //academicYear: string;
}

interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // ─── Get Profile ──────────────────────────────────────────────────────────
  getProfile(): Observable<UserProfile> {
    return this.http
      .get<ApiResponse<UserProfile>>(`${this.apiUrl}/profile`)
      .pipe(map(r => r.data));
  }
}