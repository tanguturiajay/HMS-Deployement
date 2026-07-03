import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21 defaults to zoneless change detection (no Zone.js needed)
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Restore the session from the refresh cookie before the first route resolves so a reload keeps an authenticated user signed in
    provideAppInitializer(() =>
      firstValueFrom(inject(AuthService).bootstrapSession()),
    ),
  ],
};
