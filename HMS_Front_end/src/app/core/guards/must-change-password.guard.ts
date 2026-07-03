import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Forces first-login users to change their temporary password before any protected route
export const mustChangePasswordGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  if (user?.mustChangePassword) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
