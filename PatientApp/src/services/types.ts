// Shared shapes returned by the HMS backend patient API.

export type Address = {
  houseName: string;
  houseNumber: string;
  city: string;
  postCode: string;
};

export type EmergencyContact = {
  contactName: string;
  relationship: string;
  contactNumber: string;
};

export type Patient = {
  UHID: string;
  name: string;
  phone: string;
  email: string;
  gender: "Male" | "Female";
  dob: string;
  address: Address;
  emergencyContact: EmergencyContact;
  status: "ACTIVE" | "INACTIVE";
  // Admin-provisioned accounts start with a temporary password they must change
  mustChangePassword?: boolean;
};

export type AvailabilitySlot = {
  day:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  startTime: string;
  endTime: string;
};

export type Doctor = {
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
};

export type AppointmentStatus =
  | "BOOKED"
  | "CANCELED"
  | "COMPLETED"
  | "UNATTENDED";

export type MedicalRecordStatus = "DRAFT" | "FINALIZED";

// Administration routes — codes mirror the backend domain.js / Angular app
export type AdministrationCategory =
  | "ENTERAL"
  | "PARENTERAL"
  | "TOPICAL_LOCALIZED"
  | "INHALATION_NASAL";

export type AdministrationMethod =
  | "ORAL"
  | "SUBLINGUAL"
  | "BUCCAL"
  | "RECTAL"
  | "INTRAVENOUS"
  | "INTRAMUSCULAR"
  | "SUBCUTANEOUS"
  | "INTRADERMAL"
  | "TOPICAL_TRANSDERMAL"
  | "OPHTHALMIC"
  | "OTIC"
  | "VAGINAL"
  | "INHALATION"
  | "NASAL";

export type FoodRelation = "BEFORE_FOOD" | "AFTER_FOOD";

export const ADMINISTRATION_CATEGORY_LABELS: Record<AdministrationCategory, string> = {
  ENTERAL: "Enteral (GI tract)",
  PARENTERAL: "Parenteral (Injection/Infusion)",
  TOPICAL_LOCALIZED: "Topical & Localized",
  INHALATION_NASAL: "Inhalation & Nasal",
};

export const ADMINISTRATION_METHOD_LABELS: Record<AdministrationMethod, string> = {
  ORAL: "Oral (PO)",
  SUBLINGUAL: "Sublingual",
  BUCCAL: "Buccal",
  RECTAL: "Rectal",
  INTRAVENOUS: "Intravenous (IV)",
  INTRAMUSCULAR: "Intramuscular (IM)",
  SUBCUTANEOUS: "Subcutaneous (SC)",
  INTRADERMAL: "Intradermal (ID)",
  TOPICAL_TRANSDERMAL: "Topical / Transdermal",
  OPHTHALMIC: "Ophthalmic",
  OTIC: "Otic",
  VAGINAL: "Vaginal",
  INHALATION: "Inhalation",
  NASAL: "Nasal",
};

export type FoodTiming = {
  relation?: FoodRelation;
  offsetMinutes?: number;
};

export type PrescriptionItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  foodTiming?: FoodTiming;
  administrationCategory: AdministrationCategory;
  administrationMethod: AdministrationMethod;
};

export type MedicalObservation = {
  metricName: string;
  metricValue: string;
  recordedTime: string;
};

// Full medical record (detail responses)
export type MedicalRecord = {
  medicalRecordId: string;
  appointmentId: string;
  patientUHID: string;
  patientName: string;
  doctorEmployeeId: string;
  doctorName: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  advice: string;
  prescriptionItems?: PrescriptionItem[];
  medicalObservations?: MedicalObservation[];
  // notes are internal/clinician-only and are never sent to the patient app
  status: MedicalRecordStatus;
  created_at?: string;
};

// Summary row shown in the patient's medical records list
export type MedicalRecordListItem = {
  medicalRecordId: string;
  appointmentId: string;
  doctorName: string;
  status: MedicalRecordStatus;
  created_at?: string;
};

export type Appointment = {
  appointmentId: string;
  patientUHID: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  patient?: { UHID: string; name: string; phone: string; email: string } | null;
  doctor?: {
    employeeCode: string;
    name: string;
    specialization?: string;
    department?: string;
    consultationFee?: number;
  } | null;
};

export type RegisterPayload = {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: "Male" | "Female";
  dob: string;
  address: Address;
  emergencyContact: EmergencyContact;
};

export type ProfileUpdatePayload = {
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
};
