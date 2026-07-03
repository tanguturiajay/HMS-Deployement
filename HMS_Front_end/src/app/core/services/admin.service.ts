import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage, ApiResponse, PaginatedData } from '../models/api-response.model';
import { CreateEmployeePayload, Designation, EmployeeListItem, UpdateEmployeePayload } from '../models/employee.model';
import { AuditLogsResponse } from '../models/audit.model';
import { ProfileChangeRequestsResponse } from '../models/profile-change-request.model';

// GET /admin/employees and /admin/pending-employees response shape
export type EmployeesResponse = ApiResponse<
  PaginatedData & {
    totalEmployees: number;
    employees: EmployeeListItem[];
  }
>;

// Server-side filters for the employees list
export interface EmployeeFilters {
  search?: string;
  designation?: Designation | '';
  status?: string;
}

// GET /admin/employees/:employeeCode response shape
export type EmployeeResponse = ApiResponse<EmployeeListItem>;

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  // Employee management
  createEmployee(data: CreateEmployeePayload): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/create-employee`, data);
  }

  getEmployees(
    page = 1,
    limit = 10,
    filters?: EmployeeFilters,
  ): Observable<EmployeesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.designation) {
      params = params.set('designation', filters.designation);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<EmployeesResponse>(`${this.apiUrl}/employees`, {
      params,
    });
  }

  getEmployee(employeeCode: string): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.apiUrl}/employees/${employeeCode}`);
  }

  getPendingEmployees(page = 1, limit = 10): Observable<EmployeesResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<EmployeesResponse>(`${this.apiUrl}/pending-employees`, {
      params,
    });
  }

  approveEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/approve-employee/${employeeCode}`,
      {},
    );
  }

  rejectEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/reject-employee/${employeeCode}`,
      {},
    );
  }

  updateEmployee(
    employeeCode: string,
    data: UpdateEmployeePayload,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/update-employee/${employeeCode}`,
      data,
    );
  }

  deleteEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/delete-employee/${employeeCode}`,
    );
  }

  // Recent activity (audit logs)
  getAuditLogs(page = 1, limit = 10): Observable<AuditLogsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<AuditLogsResponse>(`${this.apiUrl}/audit-logs`, {
      params,
    });
  }

  // Profile change requests
  getProfileChangeRequests(
    page = 1,
    limit = 10,
  ): Observable<ProfileChangeRequestsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ProfileChangeRequestsResponse>(
      `${this.apiUrl}/profile-change-requests`,
      { params },
    );
  }

  approveProfileChange(requestId: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/approve-profile-change/${requestId}`,
      {},
    );
  }

  rejectProfileChange(requestId: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/reject-profile-change/${requestId}`,
      {},
    );
  }
}
