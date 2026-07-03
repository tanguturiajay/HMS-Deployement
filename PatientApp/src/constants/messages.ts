// Centralized user-facing alert strings so wording stays consistent app-wide

export const ALERT_TITLES = {
  ERROR: "Error",
  SUCCESS: "Success",
  LOGIN_FAILED: "Login Failed",
  REGISTRATION_FAILED: "Registration Failed",
  REGISTERED: "Registered",
  RESET_FAILED: "Reset Failed",
  CHANGE_FAILED: "Change Failed",
  UPDATE_FAILED: "Update Failed",
  BOOKING_FAILED: "Booking Failed",
  CANCEL_FAILED: "Cancel Failed",
  SAVED: "Saved",
  BOOKED: "Booked",
  UPDATED: "Updated",
  CHECK_EMAIL: "Check your email",
  REASON_REQUIRED: "Reason required",
} as const;

export const MESSAGES = {
  GENERIC_ERROR: "Something went wrong",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  REQUEST_FAILED: (status: number) => `Request failed (${status})`,
  SESSION_EXPIRED: "Your session has expired. Please log in again.",

  REGISTER_SUCCESS: "Your account has been created. You can now log in.",
  FORGOT_PASSWORD_SENT: "If the email exists, a reset code has been sent.", // NOSONAR not a credential
  PASSWORD_RESET: "Your password has been reset. Please log in.", // NOSONAR not a credential
  PASSWORD_CHANGED: "Your password has been changed.", // NOSONAR not a credential
  PROFILE_UPDATED: "Your profile has been updated.",
  APPOINTMENT_BOOKED: "Your appointment has been booked.",
  APPOINTMENT_UPDATED: "Your appointment has been updated.",
  CANCEL_REASON_REQUIRED: "Please enter a reason for cancelling.",
  DOCTORS_LOAD_FAILED: "Could not load doctors",
  APPOINTMENTS_LOAD_FAILED: "Could not load appointments",
} as const;
