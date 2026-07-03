# HMS Front End

Angular 21 admin panel / dashboard for the **Hospital Management System (HMS)**.
It consumes the [HMS Back End](../HMS_Back_end) REST API and provides role-aware
screens for managing employees, admins, patients, appointments and approvals.

Built with modern Angular: **standalone components**, **zoneless change
detection**, **signals**, and **lazy-loaded routes**.

## Tech stack

| Area              | Library                          |
| ----------------- | -------------------------------- |
| Framework         | Angular `^21.2`                  |
| Language          | TypeScript `~5.9`                |
| Reactive          | RxJS `~7.8` + Angular signals    |
| Testing           | Vitest, jsdom                    |
| Formatting        | Prettier                         |
| Tooling           | Angular CLI / `@angular/build`   |

## Prerequisites

- Node.js and npm
- Angular CLI (use `npx ng ...`, or install globally)
- The HMS Back End running and reachable (default `http://localhost:5000/api`)

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm start            # = ng serve
```

Open `http://localhost:4200`. The app reloads on source changes.

> **CORS:** the backend only accepts requests from its configured
> `FRONTEND_URL`. Keep it set to `http://localhost:4200` during local
> development.

## Environment configuration

API endpoints are defined per build configuration in `src/environments/`:

| File                          | `production` | `apiUrl`                                  |
| ----------------------------- | ------------ | ----------------------------------------- |
| `environment.development.ts`  | `false`      | `http://localhost:5000/api`               |
| `environment.ts`              | `true`       | `https://vanguard-hms-rho.vercel.app/api` |

`angular.json` performs a file replacement so production builds use
`environment.ts` while `ng serve` / development builds use
`environment.development.ts`. Import the API URL via
`import { environment } from '.../environments/environment'`.

## Available scripts

| Script          | Action                                   |
| --------------- | ---------------------------------------- |
| `npm start`     | `ng serve` (dev server on :4200)         |
| `npm run build` | Production build to `dist/`              |
| `npm run watch` | Rebuild on change (development config)    |
| `npm test`      | Run unit tests with Vitest               |
| `npm run ng`    | Raw Angular CLI passthrough              |

## Architecture

```
src/
├── app/
│   ├── app.config.ts          # Providers: router, http client + auth interceptor, zoneless CD
│   ├── app.routes.ts          # Route tree + route guards
│   ├── core/
│   │   ├── guards/            # auth, role/designation, must-change-password, unsaved-changes
│   │   ├── interceptors/      # authInterceptor (bearer token + global error handling)
│   │   ├── models/            # Typed API/domain models
│   │   ├── services/          # AuthService, and one service per resource
│   │   └── validators/        # Reusable reactive-form validators
│   ├── features/
│   │   ├── auth/              # login, register, forgot/reset/change-password
│   │   ├── dashboard/         # overview, employees, admins, approvals, patients, appointments, profile
│   │   └── home/              # public landing page
│   └── shared/ui/             # Reusable UI: navbar, sidebar, modals, toast, slot pickers, inputs, etc.
├── environments/              # Per-config API URLs
├── index.html
├── main.ts                    # Bootstraps AppComponent with appConfig
└── styles.css
```

## Routing & access control

Routes are declared in `src/app/app.routes.ts` and lazy-load each component.

**Public:** `/` (home), `/login`, `/register`, `/forgot-password`,
`/reset-password`.

**Gated:** `/change-password` (authenticated; also the forced first-login flow).

**Dashboard tree** (`/dashboard/*`) — protected by `authGuard` +
`mustChangePasswordGuard`:

| Route                          | Allowed (besides OWNER/ADMIN superusers) |
| ------------------------------ | ---------------------------------------- |
| `overview`, `profile`          | any authenticated user                   |
| `employees`, `employees/*`     | OWNER, ADMIN only                        |
| `approvals`                    | OWNER, ADMIN only                        |
| `admins`, `admins/create`      | **OWNER only** (`ownerOnlyGuard`)        |
| `patients`, `patients/*`       | RECEPTIONIST                             |
| `appointments` (list/detail)   | RECEPTIONIST, DOCTOR                     |
| `appointments/book`, `.../edit`| RECEPTIONIST                             |

Guards (`src/app/core/guards/`):

- `authGuard` — requires a valid session, else redirects to `/login`.
- `designationGuard([...])` — designation-based access; **OWNER and ADMIN always pass** (superusers).
- `ownerOnlyGuard` — OWNER-only (defined alongside the routes).
- `mustChangePasswordGuard` — forces first-login users to set a new password.
- `unsavedChangesGuard` — `canDeactivate` guard warning on unsaved form changes.

## Authentication & HTTP

- On login, the JWT and user object are stored in `localStorage` under
  `hms_token` and `hms_user`.
- `authInterceptor` (`src/app/core/interceptors/auth.interceptor.ts`) attaches
  `Authorization: Bearer <token>` to every request and handles errors globally:
  - **401** → toast + clear session (except on public auth calls)
  - **403** → toast + redirect to `/dashboard/overview`
  - **0** → "cannot reach server" toast
- `AuthService` (`src/app/core/services/auth.service.ts`) owns all auth flows
  (login, self-register, forgot/reset/change password, `me` refresh, logout) and
  exposes both an observable (`currentUser$`) and a signal (`currentUserSignal`),
  plus accessors like `isAuthenticated()`, `getDesignation()`, `isSuperUser()`
  and `hasDesignation([...])`.

## Features

- **Overview** — role-specific dashboard landing.
- **Employees** — list, create and edit staff (OWNER/ADMIN).
- **Admins** — manage admin accounts (OWNER only).
- **Approvals** — review pending self-registrations and profile-change requests.
- **Patients** — register, search, view and edit patients (reception).
- **Appointments** — book, list, view detail, edit, cancel, complete.
- **Profile** — view and request changes to your own profile.

## Build & deploy

```bash
npm run build
```

Outputs to `dist/`. The production build uses `environment.ts` (Vercel API URL).
