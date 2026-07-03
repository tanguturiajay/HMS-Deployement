import { ApiResponse, PaginatedData } from './api-response.model';

// Medical record domain models aligned with the backend MedicalRecords schema

export type MedicalRecordStatus = 'DRAFT' | 'FINALIZED';

export const MEDICAL_RECORD_STATUSES: MedicalRecordStatus[] = [
  'DRAFT',
  'FINALIZED',
];

// Administration routes grouped by category that must stay in sync with the backend domain constants and the RN app
export type AdministrationCategory =
  | 'ENTERAL'
  | 'PARENTERAL'
  | 'TOPICAL_LOCALIZED'
  | 'INHALATION_NASAL';

export type AdministrationMethod =
  | 'ORAL'
  | 'SUBLINGUAL'
  | 'BUCCAL'
  | 'RECTAL'
  | 'INTRAVENOUS'
  | 'INTRAMUSCULAR'
  | 'SUBCUTANEOUS'
  | 'INTRADERMAL'
  | 'TOPICAL_TRANSDERMAL'
  | 'OPHTHALMIC'
  | 'OTIC'
  | 'VAGINAL'
  | 'INHALATION'
  | 'NASAL';

export type FoodRelation = 'BEFORE_FOOD' | 'AFTER_FOOD';

export const ADMINISTRATION_CATEGORIES: AdministrationCategory[] = [
  'ENTERAL',
  'PARENTERAL',
  'TOPICAL_LOCALIZED',
  'INHALATION_NASAL',
];

export const ADMINISTRATION_METHODS_BY_CATEGORY: Record<
  AdministrationCategory,
  AdministrationMethod[]
> = {
  ENTERAL: ['ORAL', 'SUBLINGUAL', 'BUCCAL', 'RECTAL'],
  PARENTERAL: ['INTRAVENOUS', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INTRADERMAL'],
  TOPICAL_LOCALIZED: ['TOPICAL_TRANSDERMAL', 'OPHTHALMIC', 'OTIC', 'VAGINAL'],
  INHALATION_NASAL: ['INHALATION', 'NASAL'],
};

export const ADMINISTRATION_CATEGORY_LABELS: Record<AdministrationCategory, string> = {
  ENTERAL: 'Enteral (GI tract)',
  PARENTERAL: 'Parenteral (Injection/Infusion)',
  TOPICAL_LOCALIZED: 'Topical & Localized',
  INHALATION_NASAL: 'Inhalation & Nasal',
};

export const ADMINISTRATION_METHOD_LABELS: Record<AdministrationMethod, string> = {
  ORAL: 'Oral (PO)',
  SUBLINGUAL: 'Sublingual',
  BUCCAL: 'Buccal',
  RECTAL: 'Rectal',
  INTRAVENOUS: 'Intravenous (IV)',
  INTRAMUSCULAR: 'Intramuscular (IM)',
  SUBCUTANEOUS: 'Subcutaneous (SC)',
  INTRADERMAL: 'Intradermal (ID)',
  TOPICAL_TRANSDERMAL: 'Topical / Transdermal',
  OPHTHALMIC: 'Ophthalmic',
  OTIC: 'Otic',
  VAGINAL: 'Vaginal',
  INHALATION: 'Inhalation',
  NASAL: 'Nasal',
};

export const FOOD_RELATIONS: FoodRelation[] = ['BEFORE_FOOD', 'AFTER_FOOD'];

export const FOOD_RELATION_LABELS: Record<FoodRelation, string> = {
  BEFORE_FOOD: 'Before food',
  AFTER_FOOD: 'After food',
};

// Short labels for the form dropdown (the "Food timing" heading supplies the context)
export const FOOD_RELATION_SHORT_LABELS: Record<FoodRelation, string> = {
  BEFORE_FOOD: 'Before',
  AFTER_FOOD: 'After',
};

// When/how a medicine relates to meals (offset stored in minutes)
export interface FoodTiming {
  relation?: FoodRelation;
  offsetMinutes?: number;
}

// A single prescription line item
export interface PrescriptionItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  foodTiming?: FoodTiming;
  administrationCategory: AdministrationCategory;
  administrationMethod: AdministrationMethod;
}

// A single recorded vital / lab test
export interface MedicalObservation {
  metricName: string;
  metricValue: string;
  recordedTime: string;
}

// Converts a food timing offset in minutes to an hours phrase for display
export function formatFoodOffset(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) {
    return '';
  }
  if (minutes === 30) {
    return 'half hour';
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hours`;
}

// Full readable food-timing phrase, e.g. "half hour before food". Empty when absent.
export function formatFoodTiming(timing?: FoodTiming | null): string {
  if (!timing?.relation) {
    return '';
  }
  const offset = formatFoodOffset(timing.offsetMinutes);
  const relation = FOOD_RELATION_LABELS[timing.relation].toLowerCase();
  return offset ? `${offset} ${relation}` : relation;
}

// Full medical record (detail / create / update responses)
export interface MedicalRecord {
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
  notes?: string;
  status: MedicalRecordStatus;
  createdByEmployeeId?: string;
  createdByName?: string;
  createdByDesignation?: string;
  created_at?: string;
  updated_at?: string;
}

// Summary row shown in list views
export interface MedicalRecordListItem {
  medicalRecordId: string;
  patientUHID: string;
  patientName: string;
  doctorEmployeeId: string;
  doctorName: string;
  appointmentId: string;
  status: MedicalRecordStatus;
  created_at?: string;
}

// Search/list filters (partial match)
export interface MedicalRecordFilters {
  patientUHID?: string;
  patientName?: string;
  doctorEmployeeId?: string;
  doctorName?: string;
  appointmentId?: string;
  status?: string;
}

// Payload to create a medical record
export interface CreateMedicalRecordPayload {
  appointmentId: string;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  advice: string;
  prescriptionItems?: PrescriptionItem[];
  medicalObservations?: MedicalObservation[];
  notes?: string;
  status: MedicalRecordStatus;
}

// Payload to update a medical record (partial fields + optional status transition)
export interface UpdateMedicalRecordPayload {
  chiefComplaint?: string;
  symptoms?: string;
  diagnosis?: string;
  advice?: string;
  prescriptionItems?: PrescriptionItem[];
  medicalObservations?: MedicalObservation[];
  notes?: string;
  status?: MedicalRecordStatus;
}

// GET /medical-records response
export interface MedicalRecordsData extends PaginatedData {
  medicalRecords: MedicalRecordListItem[];
}
export type MedicalRecordsResponse = ApiResponse<MedicalRecordsData>;

// Single-record response (also used by /by-appointment, where medicalRecord may be null)
export type MedicalRecordResponse = ApiResponse<{
  medicalRecord: MedicalRecord | null;
}>;
