import { AvailabilitySlot } from './employee.model';
import { ApiResponse, PaginatedData } from './api-response.model';

// Appointment domain models aligned with the backend Appointments schema

export type AppointmentStatus =
  | 'BOOKED'
  | 'CANCELED'
  | 'COMPLETED'
  | 'UNATTENDED';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'BOOKED',
  'CANCELED',
  'COMPLETED',
  'UNATTENDED',
];

// Lightweight patient info attached to an enriched appointment
export interface AppointmentPatientRef {
  UHID: string;
  name: string;
  phone: string;
  email: string;
}

// Lightweight doctor info attached to an enriched appointment
export interface AppointmentDoctorRef {
  employeeCode: string;
  name: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
}

export interface Appointment {
  appointmentId: string;
  patientUHID: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  createdByEmployeeId?: string;
  // Present on list / detail responses (null if the referenced doc is gone)
  patient?: AppointmentPatientRef | null;
  doctor?: AppointmentDoctorRef | null;
}

// A doctor option for the booking dropdown (GET /employees/doctors)
export interface DoctorOption {
  employeeCode: string;
  name: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
  qualification?: string[];
  joiningDate?: string;
  // Date on/after which this doctor accepts no new appointments
  bookingCutoffDate?: string;
}

// Payload to create an appointment
export interface CreateAppointmentPayload {
  patientUHID: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
}

// Payload to update an appointment (same scheduling fields as create)
export type UpdateAppointmentPayload = CreateAppointmentPayload;

// GET /appointments (and /appointments/my) response
export interface AppointmentsData extends PaginatedData {
  appointments: Appointment[];
}
export type AppointmentsResponse = ApiResponse<AppointmentsData>;

// Single-appointment response
export type AppointmentResponse = ApiResponse<{
  appointment: Appointment;
}>;

// GET /employees/doctors response
export type DoctorsResponse = ApiResponse<{
  total: number;
  doctors: DoctorOption[];
}>;

// GET /appointments/booked-slots response
export type BookedSlotsResponse = ApiResponse<{
  doctorEmployeeId: string;
  date: string;
  bookedSlots: string[];
}>;