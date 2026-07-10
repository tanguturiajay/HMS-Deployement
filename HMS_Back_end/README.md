# HMS Back End

REST API for a **Hospital Management System (HMS)**. Built with Express 5 and
MongoDB (Mongoose), it provides authentication, role/designation-based access
control, employee and patient management, appointment scheduling, an
approval-driven profile-change workflow, audit logging and transactional email.

## Tech stack

| Area            | Library                                            |
| --------------- | -------------------------------------------------- |
| Runtime         | Node.js                                            |
| Web framework   | Express `^5`                                        |
| Database / ODM  | MongoDB + Mongoose `^9`                             |
| Auth            | jsonwebtoken (JWT), bcryptjs                        |
| Validation      | express-validator                                  |
| Security / logs | helmet, cors, morgan                               |
| Email           | @getbrevo/brevo, nodemailer                        |
| API docs        | swagger-ui-express, yamljs                          |
| Testing         | Jest, Supertest                                    |

## Prerequisites

- Node.js and npm
- A reachable MongoDB instance — local (`mongodb://localhost:27017/hms`) or MongoDB Atlas

## Getting started

```bash
# 1. Install dependencies
#    NOTE: the "postinstall" hook runs `npm run seed:all`, which needs a
#    reachable MONGO_URI. Create your .env first (see below) or expect the
#    seeding step to fail (install itself still completes).
npm install

# 2. Create a .env file in the project root (see "Environment variables")

# 3. Run the server
npm run dev     # nodemon (auto-reload) — development
npm start       # plain node — production-style
```

The server listens on `PORT` (default **5000**). Quick health checks:

- `GET /` → `{ "message": "API running" }`
- `GET /api/db-status` → MongoDB connection state

## Environment variables

Create a `.env` file in the project root. **Use your own values — never commit
real secrets.** A `.env.example` (placeholders only) is recommended; `.env` is
already gitignored.

| Variable         | Description                                              | Example                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------ |
| `MONGO_URI`      | MongoDB connection string                               | `mongodb://localhost:27017/hms`      |
| `FRONTEND_URL`   | Allowed CORS origin (the Angular app)                   | `http://localhost:4200`              |
| `PATIENT_APP_URL`| Patient app deep-link base for login links in emails    | `hmsapp://`                          |
| `PORT`           | Port the API listens on                                 | `5000`                               |
| `JWT_SECRET`     | Secret used to sign/verify JWTs                          | `<long-random-string>`               |
| `JWT_EXPIRES_IN` | JWT lifetime                                             | `1d`                                 |
| `BREVO_API_KEY`  | Brevo (Sendinblue) API key for transactional email      | `<your-brevo-key>`                   |
| `EMAIL_USER`     | Sender email address                                    | `no-reply@example.com`               |
| `OWNER_PASS`     | Password for the auto-seeded OWNER account              | `<strong-password>`                  |

> ⚠️ **Security note:** the committed `.env` in this repo contains live-looking
> secrets. Rotate `JWT_SECRET`, `BREVO_API_KEY` and `OWNER_PASS`, and keep real
> values out of version control.

## Seeding & default login

Seeders run automatically in three places: on `postinstall`, on server startup
(non-fatal — a seeding error won't stop the API), and manually:

```bash
npm run seed:all
```

Seeding creates the sidebar navigation **nodes** and a single **OWNER** account:

| Field    | Value                                |
| -------- | ------------------------------------ |
| Username | `owner`                              |
| Email    | `owner@hospital.com`                 |
| Password | value of `OWNER_PASS` in your `.env` |

The OWNER is seeded with `mustChangePassword: false`. Staff/admin accounts
created through the app are typically issued a temporary password and flagged to
change it on first login.

## Roles & designations

Authorization is layered on **roles** and **designations**.

- **Roles** (on the `User`): `OWNER`, `ADMIN`, `STAFF`.
- **Staff designations**: `DOCTOR`, `RECEPTIONIST`, `CASHIER`, `NURSE`, `LAB_TECH`, `PHARMACIST`. `OWNER` and `ADMIN` are restricted designations created through dedicated flows (never self-registerable).

Department → allowed designations (`src/config/constants.js`):

| Department       | Designations        |
| ---------------- | ------------------- |
| `OPD`            | DOCTOR, NURSE       |
| `IPD`            | DOCTOR, NURSE       |
| `Lab`            | LAB_TECH            |
| `Pharmacy`       | PHARMACIST          |
| `Reception`      | RECEPTIONIST        |
| `Billing`        | CASHIER             |
| `Administration` | (admins/owner)      |

Additional rules:

- **Medical registration number** required for `DOCTOR`, `NURSE`, `PHARMACIST`.
- **Specialization** field applies to `DOCTOR`, `LAB_TECH`.

## Project structure

```
src/
├── api/
│   └── index.js            # connects DB, delegates to app
├── app.js                  # Express app: middleware + route mounting
├── server.js               # Local entrypoint: connect DB, seed, listen
├── config/
│   ├── constants.js        # Roles, designations, departments, mappings
│   └── db.js               # Mongoose connection
├── controllers/            # Route handlers (auth, admin, owner, patient, appointment, employee, node, dashboard)
├── middlewares/
│   ├── authMiddleware.js          # Verifies JWT, sets req.user
│   ├── authorizeRolesMiddleware.js
│   ├── authorizeDesignations.js
│   └── validate.js                # express-validator result handler
├── models/                 # Mongoose schemas
├── routes/                 # Express routers, one per resource
├── utils/                  # Seeders, email, audit, pagination, builders, helpers
└── validators/             # express-validator rule sets
```

## Authentication

All protected routes expect a Bearer token:

```
Authorization: Bearer <jwt>
```

`authMiddleware` verifies the token with `JWT_SECRET` and populates `req.user`.
Access is then narrowed by `authorizeRoles(...)` (role-based) or
`authorizeDesignations(...)` (designation-based). `OWNER` and `ADMIN` are
effectively superusers across most flows.

## API reference

Base paths are mounted in `src/app.js`. All paths below are relative to the
server root (e.g. `POST /api/auth/login`).

### Public / health
| Method | Path             | Purpose                     |
| ------ | ---------------- | --------------------------- |
| GET    | `/`              | Liveness check              |
| GET    | `/api/db-status` | MongoDB connection state    |

### `/api/auth`
| Method | Path               | Auth   | Purpose                                   |
| ------ | ------------------ | ------ | ----------------------------------------- |
| POST   | `/login`           | —      | Authenticate, returns JWT + user          |
| POST   | `/self-register`   | —      | Staff self-registration (pending approval)|
| PUT    | `/change-password` | Bearer | Change own password                       |
| POST   | `/forgot-password` | —      | Request a password-reset token via email  |
| POST   | `/reset-password`  | —      | Reset password using the token            |
| POST   | `/logout`          | Bearer | Logout (records last activity)            |
| GET    | `/me`              | Bearer | Current authenticated user                |

### `/api/admin` — OWNER, ADMIN
| Method | Path                                  | Purpose                          |
| ------ | ------------------------------------- | -------------------------------- |
| POST   | `/create-employee`                    | Create a staff employee + account|
| GET    | `/employees`                          | List employees                   |
| GET    | `/employees/:employeeCode`            | Get one employee                 |
| GET    | `/pending-employees`                  | List self-registered, pending    |
| PUT    | `/approve-employee/:employeeCode`     | Approve a pending employee       |
| PUT    | `/reject-employee/:employeeCode`      | Reject a pending employee        |
| PUT    | `/update-employee/:employeeCode`      | Update an employee               |
| DELETE | `/delete-employee/:employeeCode`      | Delete an employee + account     |
| GET    | `/audit-logs`                         | Read audit log                   |
| GET    | `/profile-change-requests`            | List pending profile changes     |
| PUT    | `/approve-profile-change/:requestId`  | Approve a profile change         |
| PUT    | `/reject-profile-change/:requestId`   | Reject a profile change          |

### `/api/owner` — OWNER only
| Method | Path                          | Purpose            |
| ------ | ----------------------------- | ------------------ |
| POST   | `/create-admin`               | Create an ADMIN    |
| GET    | `/admins`                     | List admins        |
| PUT    | `/update-admin/:employeeCode` | Update an admin    |
| DELETE | `/delete-admin/:employeeCode` | Delete an admin    |

### `/api/patients` — OWNER, ADMIN, RECEPTIONIST
| Method | Path               | Purpose                 |
| ------ | ------------------ | ----------------------- |
| POST   | `/create-patient`  | Register a patient      |
| GET    | `/search`          | Search patients         |
| GET    | `/`                | List patients           |
| GET    | `/:UHID`           | Get a patient by UHID   |
| PUT    | `/:UHID`           | Update a patient        |

### `/api/appointments`
| Method | Path                       | Auth                                  | Purpose                       |
| ------ | -------------------------- | ------------------------------------- | ----------------------------- |
| POST   | `/create-appointment`      | OWNER, ADMIN, RECEPTIONIST            | Book an appointment           |
| GET    | `/my`                      | DOCTOR                                | Doctor's own appointments     |
| GET    | `/booked-slots`            | OWNER, ADMIN, RECEPTIONIST            | Slots already booked          |
| GET    | `/`                        | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | List appointments             |
| GET    | `/:appointmentId`          | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | Appointment detail            |
| PUT    | `/:appointmentId`          | OWNER, ADMIN, RECEPTIONIST            | Reschedule / update           |
| PUT    | `/:appointmentId/cancel`   | OWNER, ADMIN, RECEPTIONIST            | Cancel (with reason)          |
| PUT    | `/:appointmentId/unattended` | OWNER, ADMIN, RECEPTIONIST, DOCTOR  | Mark patient unattended       |

### `/api/medical-records` — authenticated
| Method | Path                              | Auth                                  | Purpose                              |
| ------ | --------------------------------- | ------------------------------------- | ------------------------------------ |
| POST   | `/`                               | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | Create record (doctor may finalize)  |
| GET    | `/`                               | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | List/search (doctor sees own only)   |
| GET    | `/by-appointment/:appointmentId`  | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | Existing record for an appointment   |
| GET    | `/:medicalRecordId`               | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | Record detail                        |
| PUT    | `/:medicalRecordId`               | OWNER, ADMIN, RECEPTIONIST, DOCTOR    | Update draft (doctor may finalize)   |
| DELETE | `/:medicalRecordId`               | OWNER, ADMIN                          | Soft delete                          |

### `/api/employees` — authenticated
| Method | Path              | Auth                       | Purpose                              |
| ------ | ----------------- | -------------------------- | ------------------------------------ |
| GET    | `/me`             | any                        | Current user + profile               |
| GET    | `/doctors`        | OWNER, ADMIN, RECEPTIONIST | Active doctors (for booking)         |
| PUT    | `/update-profile` | any                        | Submit a profile-change request      |

### `/api/nodes` — authenticated
| Method | Path                  | Auth        | Purpose                                  |
| ------ | --------------------- | ----------- | ---------------------------------------- |
| POST   | `/create-node`        | ADMIN, OWNER| Create a sidebar/navigation node         |
| PUT    | `/update-node/:nodeId`| ADMIN, OWNER| Update a node                            |
| DELETE | `/delete-node/:nodeId`| ADMIN, OWNER| Delete a node                            |
| GET    | `/my-nodes`           | any         | Nodes visible to the user's designation  |

> **Note:** `src/routes/dashboardRoutes.js` and `dashboardController.js` exist
> (dashboard/statistics endpoints) but are **not currently mounted** in
> `src/app.js`, so those routes are not reachable until wired up.

## Data models

Mongoose models live in `src/models/`. Several use a shared `Counter` to mint
sequential, human-readable IDs:

| Model                  | ID format / notes                          |
| ---------------------- | ------------------------------------------ |
| `Users`                | Login accounts; roles, status, password    |
| `Employees`            | `EMP-000001` (sequential)                  |
| `Patients`             | `UHID-000001` (sequential)                 |
| `Appointments`         | `APT-000001` (sequential)                  |
| `Nodes`                | Sidebar navigation entries                 |
| `ProfileChangeRequests`| Pending profile edits awaiting approval    |
| `AuditLogs`            | Recorded actions                           |
| `Bills`, `Payments`, `MedicalRecords` | Supporting domain models    |
| `Counter`              | Backs the sequential ID generators         |

## Testing

```bash
npm test               # all tests
npm run test:unit      # tests/unit
npm run test:integration   # tests/integration
npm run test:coverage  # with coverage
```

> The test scripts target a `tests/` directory which is not present in the repo
> yet; add tests under `tests/unit` and `tests/integration` to use them.

## Deployment

Configured for **AWS EC2** deployment, where the application is hosted on an EC2 instance running a Node.js environment. The Express backend is managed using **PM2** for process management and served through **Nginx** as a reverse proxy. The MongoDB connection is established when the server starts and remains active for the lifetime of the application process.

Nginx routes incoming HTTP/HTTPS requests to the Express application running on the configured port, ensuring efficient request handling and SSL termination when HTTPS is enabled.

The production frontend is configured to call the backend API using the EC2 Elastic IP: http://16.112.151.129/api

