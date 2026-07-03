import { apiFetch } from "./apiClient";
import type { MedicalRecord, MedicalRecordListItem } from "./types";

// Paginated list of the patient's own FINALIZED records
type MedicalRecordsData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  medicalRecords: MedicalRecordListItem[];
};

type MedicalRecordData = { medicalRecord: MedicalRecord };

// Resolved state of an appointment's medical record
export type AppointmentRecordState = {
  state: "FINALIZED" | "DRAFT" | "NONE";
  medicalRecord: MedicalRecord | null;
};

export function getMyMedicalRecords(page = 1, limit = 10) {
  return apiFetch<MedicalRecordsData>(
    `/patient/medical-records?page=${page}&limit=${limit}`,
  );
}

export function getMedicalRecordById(medicalRecordId: string) {
  return apiFetch<MedicalRecordData>(
    `/patient/medical-records/${encodeURIComponent(medicalRecordId)}`,
  );
}

export function getMedicalRecordByAppointment(appointmentId: string) {
  return apiFetch<AppointmentRecordState>(
    `/patient/medical-records/by-appointment/${encodeURIComponent(
      appointmentId,
    )}`,
  );
}
