import { apiFetch } from "./apiClient";
import type { Appointment, AppointmentStatus, Doctor } from "./types";

// Payload types describe the data field of the envelope that apiFetch resolves with
export type AppointmentsData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  appointments: Appointment[];
};

type DoctorsData = { total: number; doctors: Doctor[] };
type BookedSlotsData = { bookedSlots: string[] };
type AppointmentData = { appointment: Appointment };

export function getMyAppointments(
  status?: AppointmentStatus,
  page = 1,
  limit = 10,
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return apiFetch<AppointmentsData>(`/patient/appointments?${params.toString()}`);
}

export function getDoctors() {
  return apiFetch<DoctorsData>("/patient/doctors");
}

export function getBookedSlots(doctorEmployeeId: string, date: string) {
  return apiFetch<BookedSlotsData>(
    `/patient/booked-slots?doctorEmployeeId=${encodeURIComponent(
      doctorEmployeeId,
    )}&date=${encodeURIComponent(date)}`,
  );
}

export function bookAppointment(
  doctorEmployeeId: string,
  appointmentDate: string,
  timeSlot: string,
) {
  return apiFetch<AppointmentData>("/patient/appointments", {
    method: "POST",
    body: { doctorEmployeeId, appointmentDate, timeSlot },
  });
}

export function updateAppointment(
  appointmentId: string,
  doctorEmployeeId: string,
  appointmentDate: string,
  timeSlot: string,
) {
  return apiFetch<AppointmentData>(`/patient/appointments/${appointmentId}`, {
    method: "PUT",
    body: { doctorEmployeeId, appointmentDate, timeSlot },
  });
}

export function cancelAppointment(
  appointmentId: string,
  cancellationReason: string,
) {
  return apiFetch<AppointmentData>(
    `/patient/appointments/${appointmentId}/cancel`,
    {
      method: "PUT",
      body: { cancellationReason },
    },
  );
}
