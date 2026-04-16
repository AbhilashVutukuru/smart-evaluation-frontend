import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NonTeachingStaffService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nonteachingstaff`;

  getAll(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  register(dto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, dto, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto, { withCredentials: true });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}