import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import {
  LoginResponse,
  MeResponse,
  RefreshResponse,
  User,
} from '../models/user.model';
import { Designation } from '../models/employee.model';
import { FormDraftService } from './form-draft.service';
import { NodeService } from './node.service';

const USER_KEY = 'hms_user';

// Designations that are treated as superusers (access to everything)
const SUPERUSER_DESIGNATIONS = new Set<Designation>([
  'OWNER',
  'ADMIN',
]);

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);
  private readonly nodeService = inject(NodeService);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signal mirror for components that prefer signals
  currentUserSignal = signal<User | null>(null);

  // Access token lives only in memory; the refresh token is an httpOnly cookie
  private accessToken: string | null = null;

  // Shared in-flight refresh so concurrent 401s trigger only one /refresh call
  private refresh$: Observable<string> | null = null;

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
    this.loadUserFromStorage();
  }

  // Auth flows
  selfRegister(data: any): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/self-register`, data);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        { email, password },
        { withCredentials: true }, // accept the httpOnly refresh cookie
      )
      .pipe(
        tap((response) => {
          if (response?.data?.accessToken && response?.data?.user) {
            this.setSession(response.data.accessToken, response.data.user);
          }
        }),
      );
  }

  forgotPassword(email: string): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/forgot-password`, {
      email,
    });
  }

  // Backend expects { resetToken, newPassword, confirmPassword }
  resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/reset-password`, {
      resetToken,
      newPassword,
      confirmPassword,
    });
  }

  // Backend expects { currentPassword, newPassword, confirmPassword }
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

  // Refreshes the cached user after a page reload (access token already in memory)
  refreshCurrentUser(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        if (response?.data?.user) {
          this.persistUser(response.data.user);
        }
      }),
    );
  }

  // Swaps the httpOnly refresh cookie for a fresh access token sharing the in flight request so a burst of 401s triggers one refresh
  refreshAccessToken(): Observable<string> {
    this.refresh$ ??= this.http
      .post<RefreshResponse>(
        `${this.apiUrl}/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.data.accessToken),
        tap((token) => {
          this.accessToken = token;
        }),
        finalize(() => {
          this.refresh$ = null;
        }),
        shareReplay(1),
      );

    return this.refresh$;
  }

  // Runs at startup: restore a session from the refresh cookie if one exists
  bootstrapSession(): Observable<unknown> {
    // No previously stored user means there is no session worth restoring
    if (!localStorage.getItem(USER_KEY)) {
      return of(null);
    }

    return this.refreshAccessToken().pipe(
      switchMap(() => this.refreshCurrentUser()),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  logout(navigate = true): void {
    // Block logout while a first-login user still must change their password
    if (this.isPasswordChangeRequired()) {
      return;
    }

    // Best-effort server notification revokes the refresh token + clears the cookie
    this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => { },
        error: () => { },
      });
    this.clearSession();
    if (navigate) {
      this.router.navigate(['/login']);
    }
  }

  // True if the logged-in user must change their password before proceeding
  isPasswordChangeRequired(): boolean {
    return !!this.getCurrentUser()?.mustChangePassword;
  }

  // Clears the session and redirects to login, bypassing the logout() guard (used on 401)
  forceClearSession(navigate = true): void {
    this.clearSession();
    if (navigate) {
      this.router.navigate(['/login']);
    }
  }

  // Session management
  private setSession(token: string, user: User): void {
    this.accessToken = token;
    this.persistUser(user);
  }

  private persistUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    this.accessToken = null;
    localStorage.removeItem(USER_KEY);
    this.formDraft.clearAll();
    this.nodeService.clearCache();
    this.currentUserSubject.next(null);
    this.currentUserSignal.set(null);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      return;
    }
    try {
      const user = JSON.parse(userStr) as User;
      this.currentUserSubject.next(user);
      this.currentUserSignal.set(user);
    } catch {
      this.clearSession();
    }
  }

  // Patches the stored user's permissions after a poll refresh
  patchPermissions(permissions: string[]): void {
    const user = this.getCurrentUser();
    if (!user) {
      return;
    }
    this.persistUser({ ...user, permissions });
  }

  // Accessors
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getDesignation(): Designation | null {
    return this.getCurrentUser()?.profile?.designation ?? null;
  }

  // True if the user is OWNER or ADMIN (full access)
  isSuperUser(): boolean {
    const designation = this.getDesignation();
    return !!designation && SUPERUSER_DESIGNATIONS.has(designation);
  }

  // Access check by designation; OWNER and ADMIN always pass
  hasDesignation(allowed: Designation[]): boolean {
    const designation = this.getDesignation();
    if (!designation) {
      return false;
    }
    if (SUPERUSER_DESIGNATIONS.has(designation)) {
      return true;
    }
    return allowed.includes(designation);
  }
}