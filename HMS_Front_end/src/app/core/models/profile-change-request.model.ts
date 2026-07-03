import { ApiResponse, PaginatedData } from './api-response.model';

export type ProfileChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// A single field diff: old value -> new value
export interface ChangeValue {
  old?: any;
  new?: any;
}

// Map of fieldName -> { old, new }. Serialized from a Mongoose Map
export interface RequestedChanges {
  [field: string]: ChangeValue;
}

export interface ProfileChangeRequest {
  requestId: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  requestedChanges: RequestedChanges;
  status: ProfileChangeStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  created_at: string;
}

// GET /admin/profile-change-requests response
export type ProfileChangeRequestsResponse = ApiResponse<
  PaginatedData & {
    requests: ProfileChangeRequest[];
  }
>;
