import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AppointmentResponse,
  AppointmentsResponse,
  BookedSlotsResponse,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../models/appointment.model';

export interface AppointmentFilters {
  status?: string;
  date?: string;
  doctorEmployeeId?: string;
  patientUHID?: string;
  // Doctor view tab: today | upcoming | past | completed
  tab?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/appointments`;

  createAppointment(
    data: CreateAppointmentPayload,
  ): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(
      `${this.apiUrl}/create-appointment`,
      data,
    );
  }

  getAppointments(
    page = 1,
    limit = 10,
    filters?: AppointmentFilters,
  ): Observable<AppointmentsResponse> {
    let params = this.buildListParams(page, limit, filters);
    return this.http.get<AppointmentsResponse>(this.apiUrl, { params });
  }

  // Doctor's own appointments
  getMyAppointments(
    page = 1,
    limit = 10,
    filters?: AppointmentFilters,
  ): Observable<AppointmentsResponse> {
    let params = this.buildListParams(page, limit, filters);
    return this.http.get<AppointmentsResponse>(`${this.apiUrl}/my`, {
      params,
    });
  }

  getAppointmentById(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}`,
    );
  }

  // Booked slots for a doctor on a date; pass excludeAppointmentId when editing
  getBookedSlots(
    doctorEmployeeId: string,
    date: string,
    excludeAppointmentId?: string,
  ): Observable<BookedSlotsResponse> {
    let params = new HttpParams()
      .set('doctorEmployeeId', doctorEmployeeId)
      .set('date', date);
    if (excludeAppointmentId) {
      params = params.set('excludeAppointmentId', excludeAppointmentId);
    }
    return this.http.get<BookedSlotsResponse>(`${this.apiUrl}/booked-slots`, {
      params,
    });
  }

  updateAppointment(
    appointmentId: string,
    data: UpdateAppointmentPayload,
  ): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}`,
      data,
    );
  }

  cancelAppointment(
    appointmentId: string,
    cancellationReason: string,
  ): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}/cancel`,
      { cancellationReason },
    );
  }

  markUnattended(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}/unattended`,
      {},
    );
  }

  private buildListParams(
    page: number,
    limit: number,
    filters?: AppointmentFilters,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.date) {
      params = params.set('date', filters.date);
    }
    if (filters?.doctorEmployeeId) {
      params = params.set('doctorEmployeeId', filters.doctorEmployeeId);
    }
    if (filters?.patientUHID) {
      params = params.set('patientUHID', filters.patientUHID);
    }
    if (filters?.tab) {
      params = params.set('tab', filters.tab);
    }
    return params;
  }
}