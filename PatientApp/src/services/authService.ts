import { apiFetch } from "./apiClient";
import type { Patient, RegisterPayload } from "./types";

// Payload types describe the data field of the envelope that apiFetch resolves with
type LoginData = {
  accessToken: string;
  refreshToken: string;
  patient: Patient;
};
type RegisterData = { patient: Patient };

export function registerPatient(payload: RegisterPayload) {
  return apiFetch<RegisterData>("/patient/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function loginPatient(email: string, password: string) {
  return apiFetch<LoginData>("/patient/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

// Revoke the refresh token server-side; sent in the body since mobile has no cookie
export function logoutPatient(refreshToken: string) {
  return apiFetch<void>("/patient/auth/logout", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });
}

export function forgotPassword(email: string) {
  return apiFetch<void>("/patient/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPassword(
  resetCode: string,
  newPassword: string,
  confirmPassword: string,
) {
  return apiFetch<void>("/patient/auth/reset-password", {
    method: "POST",
    body: { resetCode, newPassword, confirmPassword },
    auth: false,
  });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  return apiFetch<void>("/patient/auth/change-password", {
    method: "PUT",
    body: { currentPassword, newPassword, confirmPassword },
  });
}
