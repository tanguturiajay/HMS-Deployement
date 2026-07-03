import { Routes, CanActivateFn, Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { designationGuard } from './core/guards/role.guard';
import { nodeAccessGuard } from './core/guards/node-access.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

// Application routes (public, gated change-password, and the authenticated dashboard tree)
export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Authenticated change-password (voluntary or forced first-login)
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password').then(
        (m) => m.ChangePasswordComponent,
      ),
  },

  // Dashboard tree
  {
    path: 'dashboard',
    canActivate: [authGuard, mustChangePasswordGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },

      // Available to every authenticated user (defaults rendered by sidebar)
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/dashboard/overview/overview').then(
            (m) => m.OverviewComponent,
          ),
      },
      {
        path: 'profile',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/profile/profile').then(
            (m) => m.ProfileComponent,
          ),
      },

      // Employees: OWNER + ADMIN (superusers always pass)
      {
        path: 'employees',
        canActivate: [designationGuard([])], // empty list → only superusers
        loadComponent: () =>
          import('./features/dashboard/employees/employees').then(
            (m) => m.EmployeesListComponent,
          ),
      },
      {
        path: 'employees/create',
        canActivate: [designationGuard([])],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'staff' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },
      {
        path: 'employees/:code/edit',
        canActivate: [designationGuard([])],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'edit' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },

      // Approvals: OWNER + ADMIN
      {
        path: 'approvals',
        canActivate: [designationGuard([])],
        loadComponent: () =>
          import('./features/dashboard/approvals/approvals').then(
            (m) => m.ApprovalsComponent,
          ),
      },

      // Admins management: OWNER only (uses the dedicated ownerOnlyGuard below)
      {
        path: 'admins',
        canActivate: [ownerOnlyGuard()],
        loadComponent: () =>
          import('./features/dashboard/admins/admins').then(
            (m) => m.AdminsComponent,
          ),
      },
      {
        path: 'admins/create',
        canActivate: [ownerOnlyGuard()],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'admin' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },
      {
        path: 'admins/:code/edit',
        canActivate: [ownerOnlyGuard()],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'admin-edit' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },

      // Menu Nodes (sidebar node management): OWNER only
      {
        path: 'menu-nodes',
        canActivate: [ownerOnlyGuard()],
        loadComponent: () =>
          import('./features/dashboard/menu-nodes/menu-nodes').then(
            (m) => m.MenuNodesComponent,
          ),
      },

      // Patients: access driven by the Patients sidebar node
      {
        path: 'patients',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/patients' },
        loadComponent: () =>
          import('./features/dashboard/patients-list/patients-list').then(
            (m) => m.PatientsListComponent,
          ),
      },
      {
        path: 'patients/create',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/patients' },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/patient-create/patient-create').then(
            (m) => m.PatientCreateComponent,
          ),
      },
      {
        path: 'patients/:UHID',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/patients' },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/patient-detail/patient-detail').then(
            (m) => m.PatientDetailComponent,
          ),
      },

      // Appointments access is driven by the Appointments sidebar node where doctors are auto scoped to their own and booking stays reception only
      {
        path: 'appointments',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/appointments' },
        loadComponent: () =>
          import(
            './features/dashboard/appointments-list/appointments-list'
          ).then((m) => m.AppointmentsListComponent),
      },
      {
        path: 'appointments/book',
        canActivate: [nodeAccessGuard, designationGuard(['RECEPTIONIST'])],
        data: { nodePath: '/dashboard/appointments' },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import(
            './features/dashboard/appointment-book/appointment-book'
          ).then((m) => m.AppointmentBookComponent),
      },
      {
        path: 'appointments/:appointmentId/edit',
        canActivate: [nodeAccessGuard],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'edit', nodePath: '/dashboard/appointments' },
        loadComponent: () =>
          import(
            './features/dashboard/appointment-book/appointment-book'
          ).then((m) => m.AppointmentBookComponent),
      },
      {
        path: 'appointments/:appointmentId',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/appointments' },
        loadComponent: () =>
          import(
            './features/dashboard/appointment-detail/appointment-detail'
          ).then((m) => m.AppointmentDetailComponent),
      },

      // Medical Records access is driven by the Medical Records sidebar node where doctors are auto scoped to their own and delete stays owner and admin only
      {
        path: 'medical-records',
        canActivate: [nodeAccessGuard],
        data: { nodePath: '/dashboard/medical-records' },
        loadComponent: () =>
          import(
            './features/dashboard/medical-records/medical-records'
          ).then((m) => m.MedicalRecordsComponent),
      },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: '' },
];

// Local OWNER-only guard (defined here to keep all routing in one file)
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';

function ownerOnlyGuard(): CanActivateFn {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (authService.getDesignation() === 'OWNER') {
      return true;
    }

    // Authenticated but not OWNER → bounce to overview
    return router.createUrlTree(['/dashboard/overview']);
  };
}
