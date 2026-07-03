import { EmployeeProfile, UserRole } from './employee.model';
import { ApiResponse } from './api-response.model';

export interface User {
  employeeCode: string;
  username: string;
  email: string;
  roles: UserRole[];
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  profile: EmployeeProfile;
}

// POST /auth/login response (refresh token is delivered as an httpOnly cookie)
export type LoginResponse = ApiResponse<{
  accessToken: string;
  user: User;
}>;

// POST /auth/refresh response
export type RefreshResponse = ApiResponse<{
  accessToken: string;
}>;

// GET /auth/me and GET /employees/me response
export type MeResponse = ApiResponse<{
  user: User;
}>;

// Re-export commonly used role types so consumers can import from one place
export type { Designation, UserRole } from './employee.model';
