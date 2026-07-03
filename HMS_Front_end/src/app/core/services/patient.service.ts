import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import {
  CreatePatientPayload,
  PatientResponse,
  PatientSearchResponse,
  PatientsResponse,
} from '../models/patient.model';

export interface PatientFilters {
  status?: string;
  gender?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  createPatient(data: CreatePatientPayload): Observable<PatientResponse> {
    return this.http.post<PatientResponse>(
      `${this.apiUrl}/create-patient`,
      data,
    );
  }

  getPatients(
    page = 1,
    limit = 10,
    filters?: PatientFilters,
  ): Observable<PatientsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.gender) {
      params = params.set('gender', filters.gender);
    }

    return this.http.get<PatientsResponse>(this.apiUrl, { params });
  }

  searchPatients(query: string): Observable<PatientSearchResponse> {
    const params = new HttpParams().set('q', query);
    return this.http.get<PatientSearchResponse>(`${this.apiUrl}/search`, {
      params,
    });
  }

  getPatientByUHID(uhid: string): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(`${this.apiUrl}/${uhid}`);
  }

  updatePatient(
    uhid: string,
    data: Partial<CreatePatientPayload>,
  ): Observable<PatientResponse> {
    return this.http.put<PatientResponse>(`${this.apiUrl}/${uhid}`, data);
  }

  // Soft delete (admin/owner only)
  deletePatient(uhid: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/${uhid}`);
  }
}
