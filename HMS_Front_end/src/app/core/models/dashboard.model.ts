import { ApiResponse } from './api-response.model';

// Role aware overview stats where the backend returns only the subset for the caller designation so every field is optional
export interface DashboardStats {
  // Admin / Owner
  activeEmployees?: number;
  pendingApprovals?: number;
  // Admin / Owner / Receptionist
  totalPatients?: number;
  bookedAppointments?: number;
  // Doctor
  today?: number;
  upcoming?: number;
  pastDue?: number;
  completed?: number;
}

export type DashboardStatsResponse = ApiResponse<{ stats: DashboardStats }>;
