import { API_BASE_URL } from "@/config/api";
import { MESSAGES } from "@/constants/messages";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStore";

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  // When false, no Authorization header is sent (public auth endpoints)
  auth?: boolean;
};

// Field-level validation error item, as sent by the backend
export type ApiFieldError = { msg: string; path?: string };

// Wire envelope every backend response uses
type Envelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ApiFieldError[];
  // Machine-readable error code (e.g. PASSWORD_CHANGE_REQUIRED) on failures
  code?: string;
};

// Error for failed API calls; carries HTTP status (0 = network) and field-level errors
export class ApiError extends Error {
  statusCode: number;
  errors?: ApiFieldError[];

  constructor(statusCode: number, message: string, errors?: ApiFieldError[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// App root registers what to do when the refresh token is no longer valid
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(handler: () => void) {
  onSessionExpired = handler;
}

// App root registers where to send a patient still on a temporary password
let onPasswordChangeRequired: (() => void) | null = null;
export function setOnPasswordChangeRequired(handler: () => void) {
  onPasswordChangeRequired = handler;
}

// Auth endpoints must never trigger the refresh-retry, to avoid loops
const NO_REFRESH_PATHS = [
  "/patient/auth/login",
  "/patient/auth/refresh",
  "/patient/auth/register",
];

// Single-flight: a burst of 401s shares one /refresh call instead of racing
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  refreshPromise ??= (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, MESSAGES.SESSION_EXPIRED);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/patient/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      throw new ApiError(0, MESSAGES.NETWORK_ERROR);
    }

    const envelope: Envelope<{ accessToken: string; refreshToken: string }> | null =
      await response.json().catch(() => null);

    if (!response.ok || envelope?.success === false || !envelope?.data) {
      throw new ApiError(response.status, envelope?.message || MESSAGES.SESSION_EXPIRED);
    }

    await setTokens(envelope.data.accessToken, envelope.data.refreshToken);
    return envelope.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Fetch wrapper that prefixes the base URL attaches the access token refreshes once on a 401 unwraps the envelope and throws ApiError
export async function apiFetch<T = any>(
  path: string,
  { method = "GET", body, auth = true }: ApiOptions = {},
): Promise<T> {
  const sendRequest = async (): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      const token = await getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response: Response;
  try {
    response = await sendRequest();
  } catch {
    throw new ApiError(0, MESSAGES.NETWORK_ERROR);
  }

  // Access token likely expired: refresh once and replay the request
  if (
    response.status === 401 &&
    auth &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p))
  ) {
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      // Refresh token is gone or rejected: the session is over
      await clearTokens();
      onSessionExpired?.();
      throw refreshError instanceof ApiError
        ? refreshError
        : new ApiError(401, MESSAGES.SESSION_EXPIRED);
    }

    try {
      response = await sendRequest();
    } catch {
      throw new ApiError(0, MESSAGES.NETWORK_ERROR);
    }
  }

  let envelope: Envelope<T> | null = null;
  try {
    envelope = await response.json();
  } catch {
    // Non-JSON or empty body
  }

  // Account still on a temporary password: hand off to the change-password flow
  if (response.status === 403 && envelope?.code === "PASSWORD_CHANGE_REQUIRED") {
    onPasswordChangeRequired?.();
  }

  if (!response.ok || envelope?.success === false) {
    // First field-level msg beats the generic top-level validation message
    const message =
      (response.status === 422 && envelope?.errors?.[0]?.msg) ||
      envelope?.message ||
      MESSAGES.REQUEST_FAILED(response.status);
    throw new ApiError(response.status, message, envelope?.errors);
  }

  return envelope?.data as T;
}
