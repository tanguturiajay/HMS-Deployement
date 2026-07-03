import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NodeService } from '../services/node.service';

// Grants a dashboard screen only when the user sidebar holds the node that owns route.data.nodePath and the owner always passes as a lockout safety hatch
export const nodeAccessGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const nodeService = inject(NodeService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // OWNER is never gated by node membership
  if (authService.getDesignation() === 'OWNER') {
    return true;
  }

  const nodePath = route.data['nodePath'] as string;

  return nodeService.loadMyNodes().pipe(
    map((nodes) =>
      nodes.some((node) => node.path === nodePath)
        ? true
        : router.createUrlTree(['/dashboard/overview']),
    ),
  );
};
