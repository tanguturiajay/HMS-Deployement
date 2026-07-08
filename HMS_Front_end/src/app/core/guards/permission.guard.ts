import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

// Blocks a screen unless the user holds at least one of the permission codes
export const permissionGuard = (codes: string[]): CanActivateFn => {
    return (_route, state) => {
        const authService = inject(AuthService);
        const permissionService = inject(PermissionService);
        const router = inject(Router);

        if (!authService.isAuthenticated()) {
            return router.createUrlTree(['/login'], {
                queryParams: { returnUrl: state.url },
            });
        }

        if (permissionService.canAny(codes)) {
            return true;
        }

        // Authenticated but not permitted → send to the safe landing page
        return router.createUrlTree(['/dashboard/overview']);
    };
};