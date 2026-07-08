// Centralized catalog of user-facing API messages by domain

const MESSAGES = Object.freeze({

    // Cross-cutting messages used by the error handler and app plumbing
    COMMON: Object.freeze({
        API_RUNNING: "API running",
        DB_STATUS_RETRIEVED: "Database status retrieved successfully",
        DB_CONNECTION_FAILED: "Database connection failed",
        DUPLICATE_KEY: "A record with the same unique value already exists",
        INTERNAL_ERROR: "Something went wrong. Please try again later.",
        INVALID_JSON: "Malformed JSON in request body",
        NO_CHANGES: "No changes to update",
        ROUTE_NOT_FOUND: "The requested resource was not found",
        VALIDATION_FAILED: "Validation failed"
    }),

    // Authentication / authorization (staff + patient)
    AUTH: Object.freeze({
        ACCESS_DENIED: "Access denied",
        ACCOUNT_INACTIVE: "Account is inactive",
        APPROVAL_PENDING: "Admin approval is pending",
        CURRENT_PASSWORD_INCORRECT: "Current password is incorrect", // NOSONAR not a credential
        EMPLOYEE_PROFILE_NOT_FOUND: "Employee profile not found",
        INVALID_CREDENTIALS: "Invalid email or password",
        INVALID_DESIGNATION: "Invalid designation. Cannot create admin or owner accounts.",
        INVALID_RESET_CODE: "Invalid or expired reset code",
        INVALID_TOKEN: "Invalid or expired token",
        LOGIN_SUCCESS: "Login successful",
        LOGOUT_SUCCESS: "User has been logged out successfully",
        MISSING_PERMISSION: (permissions, requireAll = false) => {
            const separator = requireAll ? "' and '" : "' or '";
            return `Access Denied: You lack the required permission(s) ('${permissions.join(separator)}') to perform this action.`;
        },
        NO_TOKEN: "No token provided",
        PASSWORDS_DO_NOT_MATCH: "Passwords do not match", // NOSONAR not a credential
        PASSWORD_CHANGED: "Password changed successfully", // NOSONAR not a credential
        PASSWORD_CHANGE_REQUIRED: "You must change your password before continuing", // NOSONAR not a credential
        PASSWORD_RESET_SUCCESS: "Password reset successful", // NOSONAR not a credential
        PASSWORD_SAME_AS_CURRENT: "New password cannot be the same as current password", // NOSONAR not a credential
        REGISTRATION_REJECTED: "Registration request is rejected",
        RESET_CODE_SENT: "If the email exists, a reset code has been sent",
        RESET_LINK_SENT: "If the email exists, a reset link has been sent",
        SELF_REGISTER_SUCCESS: "Registration request successful. Wait for admin approval.",
        TOKEN_REFRESHED: "Token refreshed successfully",
        TOO_MANY_ATTEMPTS: "Too many attempts. Please try again later.",
        TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
        UNAUTHORIZED: "Unauthorized access",
        USER_NOT_FOUND: "User not found",
        USER_RETRIEVED: "User retrieved successfully"
    }),

    // Employee self-service + shared employee lookups
    EMPLOYEE: Object.freeze({
        CHANGE_REQUEST_SUBMITTED: "Your profile change request has been submitted for approval",
        DESIGNATION_INACTIVE: (designation) => `${designation} account is inactive`,
        DOCTORS_RETRIEVED: "Doctors retrieved successfully",
        DOCTOR_HAS_BOOKED_APPOINTMENTS: "This doctor still has booked appointments. Set a booking cutoff date and wait until all booked appointments are completed or cancelled before deleting.",
        DOESNT_EXIST: "Employee doesn't exist",
        EMAIL_EXISTS: "Employee with this email already exists",
        JOINING_DATE_LOCKED: "The joining date cannot be changed once it has been reached",
        LIST_RETRIEVED: "Employees retrieved successfully",
        MED_REG_EXISTS: "Employee with this medical registration number already exists",
        NOT_DESIGNATION: (designation) => `The selected employee is not a ${designation}`,
        NOT_FOUND: "Employee not found",
        NO_VALID_CHANGES: "No valid changes were requested",
        PENDING_REQUEST_EXISTS: "You already have a pending profile change request awaiting approval",
        PROFILE_UPDATED: "Your profile has been updated successfully",
        RETRIEVED: "Employee retrieved successfully",
        USERNAME_EXISTS: "Username already exists",
        USER_DOESNT_EXIST: "User doesn't exist",
        USER_EMAIL_EXISTS: "User with this email already exists"
    }),

    // Admin workflows (employee management, approvals, audit)
    ADMIN: Object.freeze({
        ACCOUNT_APPROVED: "Employee account approved successfully",
        AUDIT_LOGS_RETRIEVED: "Audit logs retrieved successfully",
        CANNOT_DELETE_PRIVILEGED: "Cannot delete OWNER or ADMIN accounts",
        CANNOT_UPDATE_PRIVILEGED: "Cannot update OWNER or ADMIN accounts",
        CHANGE_REQUESTS_RETRIEVED: "Profile change requests retrieved successfully",
        CHANGE_REQUEST_APPROVED: "Profile change request approved successfully",
        CHANGE_REQUEST_NOT_FOUND: "Profile change request not found",
        CHANGE_REQUEST_REJECTED: "Profile change request rejected successfully",
        CHANGE_REQUEST_REVIEWED: "This request has already been reviewed",
        EMPLOYEE_CREATED: "Employee account created successfully. Login credentials have been sent via email.",
        EMPLOYEE_DELETED: "Employee deleted successfully",
        EMPLOYEE_UPDATED: "Employee updated successfully",
        ONLY_STAFF_APPROVED: "Only STAFF accounts can be approved",
        ONLY_STAFF_REJECTED: "Only STAFF accounts can be rejected",
        REGISTRATION_REJECTED: "Employee registration request rejected successfully",
        STATUS_NOT_PENDING: "Account status is not pending"
    }),

    // Owner workflows (admin account management)
    OWNER: Object.freeze({
        ADMINS_RETRIEVED: "Admins retrieved successfully",
        ADMIN_CREATED: "Admin account created successfully. Credentials sent via email.",
        ADMIN_DELETED: "Admin deleted successfully",
        ADMIN_NOT_FOUND: "Admin not found",
        ADMIN_UPDATED: "Admin updated successfully",
        CANNOT_DELETE_OWNER: "Owner account cannot be deleted"
    }),

    // Patient accounts and profiles (staff-managed + self-service)
    PATIENT: Object.freeze({
        ALREADY_REGISTERED: "Patient with this email is already registered",
        CREATED: "Patient account created successfully. Login credentials have been sent via email.",
        DELETED: "Patient deleted successfully",
        DOESNT_EXIST: "Patient doesn't exist",
        EMAIL_EXISTS: "Another patient with this email already exists",
        LIST_RETRIEVED: "Patients retrieved successfully",
        NOT_FOUND: "Patient not found",
        NO_SEARCH_QUERY: "No search query provided",
        PROFILE_RETRIEVED: "Profile retrieved successfully",
        PROFILE_UPDATED: "Profile updated successfully",
        REGISTER_SUCCESS: "Registration successful. You can now log in.",
        RETRIEVED: "Patient retrieved successfully",
        SEARCH_COMPLETED: "Search completed successfully",
        UPDATED: "Patient updated successfully"
    }),

    // Appointment booking and lifecycle
    APPOINTMENT: Object.freeze({
        AFTER_BOOKING_CUTOFF: (date) => `The doctor is not accepting appointments on or after ${date}`,
        ALREADY_CANCELLED: "Appointment is already cancelled",
        ALREADY_COMPLETED: "Appointment is already completed",
        BOOKED_SLOTS_RETRIEVED: "Booked slots retrieved successfully",
        CANCELLED: "Appointment cancelled successfully",
        CANCELLED_CANNOT_COMPLETE: "Cancelled appointments cannot be completed",
        CANNOT_COMPLETE_BEFORE_TIME: "This appointment cannot be completed before its scheduled date and time have passed",
        COMPLETED: "Appointment marked as completed",
        COMPLETED_CANNOT_CANCEL: "Completed appointments cannot be cancelled",
        CREATED: "Appointment created successfully",
        DOCTOR_AND_DATE_REQUIRED: "doctorEmployeeId and date are required",
        DOCTOR_NOT_JOINED: (joinedOn) => `Doctor has not joined yet. Earliest appointment date is ${joinedOn}`,
        DOCTOR_SLOT_CONFLICT: "Doctor already has an appointment for this time slot",
        DOCTOR_UNAVAILABLE_DAY: "Doctor is unavailable on the selected day",
        DOCTOR_UNAVAILABLE_SLOT: "Doctor is unavailable for the selected time slot",
        LIST_RETRIEVED: "Appointments retrieved successfully",
        NOT_FOUND: "Appointment not found",
        ONLY_BOOKED_EDITABLE: "Only BOOKED appointments can be edited",
        ONLY_BOOKED_UNATTENDED: "Only BOOKED appointments can be marked as unattended",
        OWN_ONLY_CANCEL: "You can only cancel your own appointments",
        OWN_ONLY_COMPLETE: "You can only complete your own appointments",
        OWN_ONLY_MODIFY: "You can only modify your own appointments",
        PAST_DATE: "Cannot book an appointment in the past.",
        PAST_TIME: "Cannot book an appointment for a time that has already passed.",
        PATIENT_SLOT_CONFLICT: "Patient already has an appointment for this time slot",
        RETRIEVED: "Appointment retrieved successfully",
        TOO_FAR_AHEAD: "Appointments can only be booked up to 6 months in advance.",
        UNATTENDED: "Appointment marked as unattended",
        UPDATED: "Appointment updated successfully"
    }),

    // Medical records
    MEDICAL_RECORD: Object.freeze({
        ALREADY_EXISTS: "A medical record already exists for this appointment",
        APPOINTMENT_NOT_ELIGIBLE: "A medical record cannot be created for a cancelled or unattended appointment",
        CANNOT_BEFORE_START: "A medical record can only be generated after the appointment start time has passed",
        CREATED: "Medical record created successfully",
        DELETED: "Medical record deleted successfully",
        FIELDS_REQUIRED: "Chief complaint, symptoms, diagnosis and advice are required and cannot be empty",
        INVALID_ADMINISTRATION: "A prescription item has an invalid administration category or method",
        LIST_RETRIEVED: "Medical records retrieved successfully",
        NOT_FOUND: "Medical record not found",
        OBSERVATION_INCOMPLETE: "Each medical observation must include a metric name, value and recorded time",
        ONLY_DRAFT_EDITABLE: "Only draft medical records can be edited",
        OWN_ONLY: "You can only access medical records for your own appointments",
        PRESCRIPTION_REQUIRED: "Each prescription item must include name, dosage, frequency, duration and administration method",
        RETRIEVED: "Medical record retrieved successfully",
        STAFF_CANNOT_FINALIZE: "Only the assigned doctor can finalize a medical record",
        UPDATED: "Medical record updated successfully"
    }),

    // Organization nodes (hierarchy management)
    NODE: Object.freeze({
        CREATED: "Node created successfully",
        DELETED: "Node deleted successfully",
        LIST_RETRIEVED: "Nodes retrieved successfully",
        NOT_FOUND: "Node not found",
        OWNER_LOCKED: "This is a system node and its access is locked to OWNER",
        PATH_EXISTS: "Node path already exists",
        SYSTEM_LOCKED: "This is a management node and can only be assigned to OWNER or ADMIN",
        UPDATED: "Node updated successfully"
    }),

    // Designation action permissions
    PERMISSION: Object.freeze({
        LIST_RETRIEVED: "Permissions retrieved successfully",
        MY_RETRIEVED: "Your permissions retrieved successfully",
        NODE_ACCESS_REQUIRED: "Permissions can only be granted for modules the designation can access from the sidebar",
        NOT_ELIGIBLE: "Some of the selected permissions cannot be granted to this designation",
        OWNER_LOCKED: "Owner permissions cannot be modified",
        UPDATED: "Permissions updated successfully"
    }),

    // Dashboard statistics
    DASHBOARD: Object.freeze({
        ADMIN_STATS_RETRIEVED: "Admin dashboard statistics retrieved successfully",
        APPOINTMENT_STATS_RETRIEVED: "Appointment statistics retrieved successfully",
        DOCTOR_STATS_RETRIEVED: "Doctor dashboard statistics retrieved successfully",
        EMPLOYEE_STATS_RETRIEVED: "Employee statistics retrieved successfully",
        PATIENT_STATS_RETRIEVED: "Patient statistics retrieved successfully",
        RECEPTIONIST_STATS_RETRIEVED: "Receptionist dashboard statistics retrieved successfully",
        UNAUTHORIZED: "Unauthorized to access dashboard statistics"
    }),

    // Audit-trail entries written via recordAudit
    AUDIT: Object.freeze({
        USER_LOGIN: (id) => `Login successful for ${id}`,
        USER_LOGIN_FAILED: (email) => `Failed login attempt for ${email}`,
        USER_LOGOUT: (id) => `${id} has logged out`,
        PASSWORD_CHANGED: (id) => `Password changed for ${id}`, // NOSONAR not a credential
        PASSWORD_RESET_REQUESTED: (id) => `Password reset requested for ${id}`, // NOSONAR not a credential
        PASSWORD_RESET_COMPLETED: (id) => `Password reset completed for ${id}`, // NOSONAR not a credential
        REFRESH_REUSE_DETECTED: (id) => `Refresh token reuse detected for ${id}; all sessions revoked`,
        ADMIN_CREATED: (name, code) => `Admin account created for ${name} (${code})`,
        ADMIN_DELETED: (name, code) => `Admin ${name} (${code}) was deleted`,
        ADMIN_UPDATED: (name, code) => `Admin ${name} (${code}) was updated`,
        APPOINTMENT_BOOKED: (id, patientName, doctorName) => `Appointment ${id} booked for ${patientName} with ${doctorName}`,
        APPOINTMENT_BOOKED_BY_PATIENT: (id, patientName, doctorName) => `Appointment ${id} booked by ${patientName} with ${doctorName}`,
        APPOINTMENT_CANCELLED: (id, reason) => `Appointment ${id} was cancelled. Reason: ${reason}`,
        APPOINTMENT_CANCELLED_BY_PATIENT: (id, reason) => `Appointment ${id} cancelled by patient. Reason: ${reason}`,
        APPOINTMENT_COMPLETED: (id) => `Appointment ${id} was marked completed`,
        APPOINTMENT_MARKED_UNATTENDED: (role, userName) =>
            `Appointment marked as UNATTENDED by ${role} ${userName}. No medical record generated. Patient notified via email.`,
        APPOINTMENT_RESCHEDULED_BY_PATIENT: (id, patientName) => `Appointment ${id} rescheduled by ${patientName}`,
        APPOINTMENT_UPDATED: (id) => `Appointment ${id} was updated`,
        MEDICAL_RECORD_DELETED: (id, role, userName) => `Medical record ${id} was deleted by ${role} ${userName}`,
        MEDICAL_RECORD_DOCTOR_CREATED_DRAFT: (doctorName) =>
            `Medical record created by Doctor ${doctorName}. Current status: DRAFT. Waiting for finalization.`,
        MEDICAL_RECORD_DOCTOR_CREATED_FINALIZED: (doctorName) =>
            `Medical record created and finalized by Doctor ${doctorName}. Appointment status changed to COMPLETED.`,
        MEDICAL_RECORD_DOCTOR_UPDATED_DRAFT: (doctorName) =>
            `Medical record updated by Doctor ${doctorName}. Current status: DRAFT. Waiting for finalization.`,
        MEDICAL_RECORD_DOCTOR_UPDATED_FINALIZED: (doctorName) =>
            `Medical record updated and finalized by Doctor ${doctorName}. Medical record status changed to FINALIZED. Appointment status changed to COMPLETED.`,
        MEDICAL_RECORD_STAFF_CREATED_DRAFT: (role, userName, doctorEmployeeId, doctorName) =>
            `Medical record created by ${role} ${userName}. Assigned doctor for verification: ${doctorEmployeeId} (${doctorName}). Current status: DRAFT. Waiting for doctor verification.`,
        MEDICAL_RECORD_STAFF_UPDATED_DRAFT: (role, userName, doctorEmployeeId, doctorName) =>
            `Medical record updated by ${role} ${userName}. Assigned doctor for verification: ${doctorEmployeeId} (${doctorName}). Current status: DRAFT. Waiting for doctor verification.`,
        MEDICAL_RECORD_VERIFIED_FINALIZED: (creatorRole, creatorName, doctorName) =>
            `Medical record created by ${creatorRole} ${creatorName}. Verified and finalized by Doctor ${doctorName}. Medical record status changed to FINALIZED. Appointment status changed to COMPLETED.`,
        DOCTOR_SCHEDULE_CHANGE_CANCELLATION: (id, doctorName, code) =>
            `Appointment ${id} was cancelled due to a schedule change for doctor ${doctorName} (${code})`,
        EMPLOYEE_APPROVED: (code, username) => `Employee account ${code} (${username}) was approved`,
        EMPLOYEE_CREATED: (name, code, designation) => `Employee ${name} (${code}) was created as ${designation}`,
        EMPLOYEE_DELETED: (name, code) => `Employee ${name} (${code}) was deleted`,
        EMPLOYEE_PROFILE_UPDATED: (name, code) => `${name} (${code}) updated their profile`,
        EMPLOYEE_REGISTRATION_REJECTED: (code, username) => `Employee registration ${code} (${username}) was rejected`,
        EMPLOYEE_UPDATED: (name, code) => `Employee ${name} (${code}) was updated`,
        NODE_CREATED: (name, nodeId) => `Menu node ${name} (${nodeId}) was created`,
        NODE_DELETED: (name, nodeId) => `Menu node ${name} (${nodeId}) was deleted`,
        NODE_UPDATED: (name, nodeId) => `Menu node ${name} (${nodeId}) was updated`,
        PERMISSIONS_UPDATED: (designation) => `Action permissions updated for the ${designation} designation`,
        PATIENT_DELETED: (name, uhid) => `Patient ${name} (${uhid}) was deleted`,
        PATIENT_PROFILE_UPDATED: (name, uhid) => `Patient ${name} (${uhid}) updated their profile`,
        PATIENT_REGISTERED: (name, uhid) => `Patient ${name} (${uhid}) was registered`,
        PATIENT_UPDATED: (name, uhid) => `Patient ${name} (${uhid}) was updated`,
        PROFILE_CHANGE_APPROVED: (requestId, name, code) => `Profile change ${requestId} for ${name} (${code}) was approved`,
        PROFILE_CHANGE_REJECTED: (requestId, name, code) => `Profile change ${requestId} for ${name} (${code}) was rejected`,
        PROFILE_CHANGE_REQUESTED: (name, code) => `${name} (${code}) requested a profile change`
    })
});

module.exports = MESSAGES;