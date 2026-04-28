import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateEnquiryRequest {
  instituteName: string;
  state: string;
  townOrCity: string;
  address: string;
  contactPersonName: string;
  email: string;
  phoneNumber: string;
  numberOfStudents: number;
  instituteType: string;
  websiteUrl?: string;
  message?: string;
}

export interface EnquiryResponse {
  success: boolean;
  message: string;
  id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnquiryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/enquiry`;

  submitEnquiry(data: CreateEnquiryRequest): Observable<EnquiryResponse> {
    return this.http.post<EnquiryResponse>(this.apiUrl, data);
  }
}