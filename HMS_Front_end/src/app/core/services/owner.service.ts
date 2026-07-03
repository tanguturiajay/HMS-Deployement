import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage, ApiResponse, PaginatedData } from '../models/api-response.model';
import { CreateEmployeePayload, EmployeeListItem } from '../models/employee.model';

// GET /owner/admins response shape
export type AdminsResponse = ApiResponse<
  PaginatedData & {
    totalAdmins: number;
    admins: EmployeeListItem[];
  }
>;

@Injectable({
  providedIn: 'root',
})
export class OwnerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/owner`;

  createAdmin(data: CreateEmployeePayload): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/create-admin`, data);
  }

  getAdmins(page = 1, limit = 10): Observable<AdminsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<AdminsResponse>(`${this.apiUrl}/admins`, { params });
  }

  updateAdmin(
    employeeCode: string,
    data: Partial<CreateEmployeePayload>,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/update-admin/${employeeCode}`,
      data,
    );
  }

  deleteAdmin(employeeCode: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/delete-admin/${employeeCode}`,
    );
  }
}
