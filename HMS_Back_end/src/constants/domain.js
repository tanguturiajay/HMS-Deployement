// Staff designations that can be created or self-registered
const STAFF_DESIGNATIONS = [
  "DOCTOR",
  "RECEPTIONIST",
  "CASHIER",
  "NURSE",
  "LAB_TECH",
  "PHARMACIST",
];

// All departments matching the Employees schema enum
const DEPARTMENTS = [
  "OPD",
  "IPD",
  "Lab",
  "Pharmacy",
  "Administration",
  "Reception",
  "Billing",
];

// Designations that require a medical registration number
const MEDICAL_DESIGNATIONS = ["DOCTOR", "NURSE", "PHARMACIST"];

// Designations that carry a specialization field
const SPECIALIZATION_DESIGNATIONS = ["DOCTOR", "LAB_TECH"];

// Privileged roles created through dedicated flows
const RESTRICTED_ROLES = ["OWNER", "ADMIN"];

// System nodes whose access stays locked to the owner so control pages never leak
const OWNER_ONLY_PATHS = [
  "/dashboard/menu-nodes",
  "/dashboard/permissions",
];

// Management nodes grantable to owner and admin only, never to staff
const ADMIN_MAX_PATHS = [
  "/dashboard/admins",
  "/dashboard/employees",
  "/dashboard/approvals",
];

// Valid staff designations per department
const DEPARTMENT_DESIGNATIONS = {
  OPD: ["DOCTOR", "NURSE"],
  IPD: ["DOCTOR", "NURSE"],
  Lab: ["LAB_TECH"],
  Pharmacy: ["PHARMACIST"],
  Reception: ["RECEPTIONIST"],
  Billing: ["CASHIER"],
  Administration: [],
};

// Routes of drug administration, grouped by category
const ADMINISTRATION_CATEGORIES = [
  "ENTERAL",
  "PARENTERAL",
  "TOPICAL_LOCALIZED",
  "INHALATION_NASAL",
];

// Valid administration methods per category
const ADMINISTRATION_METHODS_BY_CATEGORY = {
  ENTERAL: ["ORAL", "SUBLINGUAL", "BUCCAL", "RECTAL"],
  PARENTERAL: ["INTRAVENOUS", "INTRAMUSCULAR", "SUBCUTANEOUS", "INTRADERMAL"],
  TOPICAL_LOCALIZED: ["TOPICAL_TRANSDERMAL", "OPHTHALMIC", "OTIC", "VAGINAL"],
  INHALATION_NASAL: ["INHALATION", "NASAL"],
};

// Flat list of every method
const ADMINISTRATION_METHODS = Object.values(
  ADMINISTRATION_METHODS_BY_CATEGORY
).flat();

// Whether a medicine is taken before or after food
const FOOD_RELATIONS = ["BEFORE_FOOD", "AFTER_FOOD"];

// Set variants for O(1) membership checks
const STAFF_DESIGNATIONS_SET = new Set(STAFF_DESIGNATIONS);
const DEPARTMENTS_SET = new Set(DEPARTMENTS);
const MEDICAL_DESIGNATIONS_SET = new Set(MEDICAL_DESIGNATIONS);
const SPECIALIZATION_DESIGNATIONS_SET = new Set(SPECIALIZATION_DESIGNATIONS);
const RESTRICTED_ROLES_SET = new Set(RESTRICTED_ROLES);
const OWNER_ONLY_PATHS_SET = new Set(OWNER_ONLY_PATHS);
const ADMIN_MAX_PATHS_SET = new Set(ADMIN_MAX_PATHS);

module.exports = {
  STAFF_DESIGNATIONS,
  DEPARTMENTS,
  MEDICAL_DESIGNATIONS,
  SPECIALIZATION_DESIGNATIONS,
  RESTRICTED_ROLES,
  OWNER_ONLY_PATHS,
  OWNER_ONLY_PATHS_SET,
  ADMIN_MAX_PATHS,
  ADMIN_MAX_PATHS_SET,
  DEPARTMENT_DESIGNATIONS,
  ADMINISTRATION_CATEGORIES,
  ADMINISTRATION_METHODS_BY_CATEGORY,
  ADMINISTRATION_METHODS,
  FOOD_RELATIONS,
  STAFF_DESIGNATIONS_SET,
  DEPARTMENTS_SET,
  MEDICAL_DESIGNATIONS_SET,
  SPECIALIZATION_DESIGNATIONS_SET,
  RESTRICTED_ROLES_SET,
};