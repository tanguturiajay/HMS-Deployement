// Centralized user-facing fallback strings so wording stays consistent app-wide
export const APP_MESSAGES = {
  GENERIC_ERROR: 'Something went wrong',
  SESSION_EXPIRED: 'Session expired. Please login again.',
  ACCESS_DENIED: 'Access denied. You do not have permission.',
  NETWORK_ERROR: 'Cannot reach server. Check your connection.',

  // Auth
  LOGIN_FAILED: 'Login failed. Please try again.',
  REGISTRATION_FAILED: 'Registration failed. Please try again.',
  REGISTRATION_SUBMITTED: 'Registration request submitted. Await admin approval.',
  FORGOT_PASSWORD_FAILED: 'Failed to send reset link. Please try again.', // NOSONAR not a credential
  RESET_LINK_SENT: 'If the email exists, a reset link has been sent',
  PASSWORD_RESET: 'Password reset successful.', // NOSONAR not a credential
  PASSWORD_RESET_FAILED: 'Failed to reset password. Please try again.', // NOSONAR not a credential
  PASSWORD_CHANGED: 'Password changed successfully.', // NOSONAR not a credential
  PASSWORD_CHANGE_FAILED: 'Failed to change password. Please try again.', // NOSONAR not a credential

  // Loads
  LOAD_PATIENTS_FAILED: 'Failed to load patients.',
  LOAD_PATIENT_FAILED: 'Failed to load patient.',
  LOAD_EMPLOYEES_FAILED: 'Failed to load employees.',
  LOAD_NODES_FAILED: 'Failed to load menu nodes.',
  LOAD_EMPLOYEE_FAILED: 'Failed to load employee data.',
  LOAD_ADMINS_FAILED: 'Failed to load admins.',
  LOAD_APPOINTMENTS_FAILED: 'Failed to load appointments.',
  LOAD_APPOINTMENT_FAILED: 'Failed to load appointment.',
  LOAD_DOCTORS_FAILED: 'Failed to load doctors.',
  LOAD_APPROVALS_FAILED: 'Failed to load approvals.',
  LOAD_PROFILE_FAILED: 'Failed to load profile.',
  LOAD_STATS_FAILED: 'Failed to load statistics.',

  // Patients
  PATIENT_CREATED: 'Patient created.',
  PATIENT_CREATE_FAILED: 'Failed to create patient.',
  PATIENT_UPDATED: 'Patient updated.',
  PATIENT_UPDATE_FAILED: 'Failed to update patient.',
  PATIENT_DELETED: 'Patient deleted.',
  PATIENT_DELETE_FAILED: 'Failed to delete patient.',

  // Employees / admins
  EMPLOYEE_CREATED: 'Employee created. Credentials sent via email.',
  EMPLOYEE_CREATE_FAILED: 'Failed to create employee.',
  EMPLOYEE_UPDATED: 'Employee updated.',
  EMPLOYEE_UPDATE_FAILED: 'Failed to update employee.',
  EMPLOYEE_DELETED: 'Employee deleted.',
  EMPLOYEE_DELETE_FAILED: 'Failed to delete employee.',
  ADMIN_CREATED: 'Admin created. Credentials sent via email.',
  ADMIN_CREATE_FAILED: 'Failed to create admin.',
  ADMIN_UPDATED: 'Admin updated.',
  ADMIN_UPDATE_FAILED: 'Failed to update admin.',
  ADMIN_DELETED: 'Admin deleted.',

  // Menu nodes (sidebar node management)
  NODE_CREATED: 'Menu node created.',
  NODE_CREATE_FAILED: 'Failed to create menu node.',
  NODE_UPDATED: 'Menu node updated.',
  NODE_UPDATE_FAILED: 'Failed to update menu node.',
  NODE_DELETED: 'Menu node deleted.',
  NODE_DELETE_FAILED: 'Failed to delete menu node.',
  ADMIN_DELETE_FAILED: 'Failed to delete admin.',

  // Approvals / profile changes
  EMPLOYEE_APPROVED: 'Employee approved.',
  EMPLOYEE_APPROVE_FAILED: 'Failed to approve employee.',
  EMPLOYEE_REJECTED: 'Employee rejected.',
  EMPLOYEE_REJECT_FAILED: 'Failed to reject employee.',
  PROFILE_CHANGE_APPROVED: 'Profile change approved.',
  PROFILE_CHANGE_APPROVE_FAILED: 'Failed to approve profile change.',
  PROFILE_CHANGE_REJECTED: 'Profile change rejected.',
  PROFILE_CHANGE_REJECT_FAILED: 'Failed to reject profile change.',
  PROFILE_UPDATED: 'Profile updated.',
  PROFILE_UPDATE_FAILED: 'Failed to update profile.',

  // Appointments
  APPOINTMENT_BOOKED: 'Appointment booked.',
  APPOINTMENT_BOOK_FAILED: 'Failed to book appointment.',
  APPOINTMENT_UPDATED: 'Appointment updated.',
  APPOINTMENT_UPDATE_FAILED: 'Failed to update appointment.',
  APPOINTMENT_CANCELLED: 'Appointment cancelled.',
  APPOINTMENT_CANCEL_FAILED: 'Failed to cancel.',
  APPOINTMENT_COMPLETED: 'Appointment marked as completed.',
  APPOINTMENT_COMPLETE_FAILED: 'Failed to complete appointment.',
  APPOINTMENT_SLOT_UNAVAILABLE:
    'The original time slot is no longer available. Please select a new slot.',
} as const;
