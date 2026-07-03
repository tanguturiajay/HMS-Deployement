import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import {
  CreateMedicalRecordPayload,
  MedicalRecordFilters,
  MedicalRecordResponse,
  MedicalRecordsResponse,
  UpdateMedicalRecordPayload,
} from '../models/medical-record.model';

@Injectable({
  providedIn: 'root',
})
export class MedicalRecordService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/medical-records`;

  list(
    page = 1,
    limit = 10,
    filters?: MedicalRecordFilters,
  ): Observable<MedicalRecordsResponse> {
    const params = this.buildListParams(page, limit, filters);
    return this.http.get<MedicalRecordsResponse>(this.apiUrl, { params });
  }

  getById(medicalRecordId: string): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${this.apiUrl}/${medicalRecordId}`,
    );
  }

  // Returns the existing record for an appointment, or { medicalRecord: null }
  getByAppointment(appointmentId: string): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${this.apiUrl}/by-appointment/${appointmentId}`,
    );
  }

  create(
    data: CreateMedicalRecordPayload,
  ): Observable<MedicalRecordResponse> {
    return this.http.post<MedicalRecordResponse>(this.apiUrl, data);
  }

  update(
    medicalRecordId: string,
    data: UpdateMedicalRecordPayload,
  ): Observable<MedicalRecordResponse> {
    return this.http.put<MedicalRecordResponse>(
      `${this.apiUrl}/${medicalRecordId}`,
      data,
    );
  }

  delete(medicalRecordId: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/${medicalRecordId}`);
  }

  private buildListParams(
    page: number,
    limit: number,
    filters?: MedicalRecordFilters,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.patientUHID) {
      params = params.set('patientUHID', filters.patientUHID);
    }
    if (filters?.patientName) {
      params = params.set('patientName', filters.patientName);
    }
    if (filters?.doctorEmployeeId) {
      params = params.set('doctorEmployeeId', filters.doctorEmployeeId);
    }
    if (filters?.doctorName) {
      params = params.set('doctorName', filters.doctorName);
    }
    if (filters?.appointmentId) {
      params = params.set('appointmentId', filters.appointmentId);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    return params;
  }
}
