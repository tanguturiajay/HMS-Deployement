import { ApiResponse, PaginatedData } from './api-response.model';

export type Gender = 'Male' | 'Female';
export type PatientStatus = 'ACTIVE' | 'INACTIVE';

export interface PatientAddress {
  houseName: string;
  houseNumber: string;
  city: string;
  postCode: string;
}

export interface EmergencyContact {
  contactName: string;
  relationship: string;
  contactNumber: string;
}

export interface Patient {
  UHID: string;
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string;
  address: PatientAddress;
  emergencyContact: EmergencyContact;
  status: PatientStatus;
  mustChangePassword?: boolean;
  createdByEmployeeId?: string;
}

// Payload for creating a patient
export interface CreatePatientPayload {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string;
  address: PatientAddress;
  emergencyContact: EmergencyContact;
  status?: PatientStatus;
}

// GET /patients response
export interface PatientsData extends PaginatedData {
  patients: Patient[];
}
export type PatientsResponse = ApiResponse<PatientsData>;

// GET /patients/search response
export type PatientSearchResponse = ApiResponse<{
  total: number;
  patients: Patient[];
}>;

// Single-patient response (create / get / update)
export type PatientResponse = ApiResponse<{
  patient: Patient;
}>;

export const GENDERS: Gender[] = ['Male', 'Female'];
export const PATIENT_STATUSES: PatientStatus[] = ['ACTIVE', 'INACTIVE'];
