import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
    MyPermissionsResponse,
    PermissionsResponse,
    UpdatePermissionsResponse,
} from '../models/permission.model';

@Injectable({
    providedIn: 'root',
})
export class PermissionService {
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);
    private readonly apiUrl = `${environment.apiUrl}/permissions`;

    // Effective permissions ride on the stored user so no extra request is needed
    readonly myPermissions = computed<ReadonlySet<string>>(
        () => new Set(this.authService.currentUserSignal()?.permissions ?? []),
    );

    // True when the current user holds the permission code
    can(code: string): boolean {
        return this.myPermissions().has(code);
    }

    // True when the current user holds at least one of the codes
    canAny(codes: string[]): boolean {
        const granted = this.myPermissions();
        return codes.some((code) => granted.has(code));
    }

    // Fetches fresh effective permissions and patches the stored user (sidebar poll)
    refreshMyPermissions(): Observable<string[]> {
        return this.http
            .get<MyPermissionsResponse>(`${this.apiUrl}/my-permissions`)
            .pipe(
                map((res) => res.data?.permissions ?? []),
                tap((permissions) => this.authService.patchPermissions(permissions)),
            );
    }

    // OWNER-only: grouped catalog plus every designation's granted codes
    getPermissions(): Observable<PermissionsResponse> {
        return this.http.get<PermissionsResponse>(this.apiUrl);
    }

    // OWNER-only: replace a designation's granted codes
    updatePermissions(
        designation: string,
        permissions: string[],
    ): Observable<UpdatePermissionsResponse> {
        return this.http.put<UpdatePermissionsResponse>(
            `${this.apiUrl}/update-permissions/${designation}`,
            { permissions },
        );
    }
}