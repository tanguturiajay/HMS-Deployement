import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { APP_MESSAGES } from '../constants/messages';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/self-register',
  '/auth/refresh',
  '/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  // Attach the in-memory access token to every outgoing request
  const token = authService.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p));

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // A protected 401 triggers one silent refresh and retry while public auth calls are excluded to avoid loops
      if (error.status === 401 && !isPublicAuthCall) {
        return authService.refreshAccessToken().pipe(
          switchMap((newToken) =>
            next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              }),
            ),
          ),
          catchError((refreshError) => {
            toastService.error(APP_MESSAGES.SESSION_EXPIRED);
            authService.forceClearSession();
            return throwError(() => refreshError);
          }),
        );
      }

      // Other cross-cutting statuses are toasted here; the rest surface via ApiErrorHandlerService
      switch (error.status) {
        case 403:
          toastService.error(APP_MESSAGES.ACCESS_DENIED);
          router.navigate(['/dashboard/overview']);
          break;

        case 0:
          toastService.error(APP_MESSAGES.NETWORK_ERROR);
          break;
      }

      return throwError(() => error);
    }),
  );
};
