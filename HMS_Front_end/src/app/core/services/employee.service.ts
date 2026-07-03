import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeResponse } from '../models/user.model';
import { DoctorsResponse } from '../models/appointment.model';
import { ApiResponse } from '../models/api-response.model';
import { EmployeeProfile } from '../models/employee.model';

// Update-profile response; OWNER/ADMIN apply immediately, staff create a pending request
export type ProfileUpdateRequestResponse = ApiResponse<{
  employee?: EmployeeProfile;
  request?: {
    requestId: string;
    status: string;
    requestedChanges: Record<string, { old?: any; new?: any }>;
  };
}>;

// Self-editable profile fields (phone + qualification only)
export interface ProfileUpdatePayload {
  phone?: string;
  qualification?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  // Short lived cache for the doctor dropdown that stores only successful responses and bounds staleness with a TTL
  private doctorsCache: DoctorsResponse | null = null;
  private doctorsCachedAt = 0;
  private static readonly DOCTORS_TTL_MS = 5 * 60 * 1000;

  // Current authenticated user and profile
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`);
  }

  // Active doctors for the appointment booking dropdown (cached for DOCTORS_TTL_MS)
  getDoctors(): Observable<DoctorsResponse> {
    const fresh =
      Date.now() - this.doctorsCachedAt < EmployeeService.DOCTORS_TTL_MS;
    if (this.doctorsCache && fresh) {
      return of(this.doctorsCache);
    }
    return this.http.get<DoctorsResponse>(`${this.apiUrl}/doctors`).pipe(
      tap((res) => {
        this.doctorsCache = res;
        this.doctorsCachedAt = Date.now();
      }),
    );
  }

  // Invalidate the doctor cache (call after employee create/update/delete)
  clearDoctorsCache(): void {
    this.doctorsCache = null;
    this.doctorsCachedAt = 0;
  }

  // Updates own profile; OWNER/ADMIN apply immediately, staff changes need approval
  profileUpdate(
    data: ProfileUpdatePayload,
  ): Observable<ProfileUpdateRequestResponse> {
    return this.http.put<ProfileUpdateRequestResponse>(
      `${this.apiUrl}/update-profile`,
      data,
    );
  }
}