import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Designation } from '../models/employee.model';

// Designation-based access guard; OWNER and ADMIN always pass
export const designationGuard = (
  allowed: Designation[],
): CanActivateFn => {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (authService.hasDesignation(allowed)) {
      return true;
    }

    // Authenticated but not permitted → send to the safe landing page
    return router.createUrlTree(['/dashboard/overview']);
  };
};

// Backward-compatible alias so existing imports keep working
export const roleGuard = designationGuard;