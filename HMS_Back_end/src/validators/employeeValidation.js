const { body } = require("express-validator");
const {
  nameValidator,
  phoneValidator,
  emailValidator,
} = require("./sharedValidators");
const {
  STAFF_DESIGNATIONS,
  DEPARTMENTS,
  MEDICAL_DESIGNATIONS_SET,
  SPECIALIZATION_DESIGNATIONS_SET,
  DEPARTMENT_DESIGNATIONS,
} = require("../constants/domain");

// Medical registration number: "MED-" followed by digits and hyphens (e.g. MED-12345)
const MED_REG_REGEX = /^MED-[0-9-]+$/;

// Parses "HH:mm" into total minutes; returns null for invalid input
const toMinutes = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(t || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const VALID_DAYS = new Set([
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
]);

const parseDay = (raw) => {
  if (!raw) throw new Error("Each availability slot must include a day");
  const day = String(raw).toUpperCase();
  if (!VALID_DAYS.has(day)) {
    throw new Error(`Invalid day "${raw}". Must be a full weekday name (e.g. MONDAY)`);
  }
  return day;
};

const parseTimeRange = (slot) => {
  const start = toMinutes(slot.startTime);
  const end = toMinutes(slot.endTime);
  if (start === null || end === null || start >= end) {
    throw new Error("Each slot's start time must be before its end time");
  }
  return { start, end };
};

// Throws if [start, end) overlaps any already-seen range on the same day
const checkOverlap = (start, end, existingSlots, day, startTime, endTime) => {
  for (const e of existingSlots) {
    if (start < e.end && end > e.start) {
      throw new Error(
        `Overlapping slots on ${day}: ${startTime}–${endTime} overlaps with ${e.startTime}–${e.endTime}`,
      );
    }
  }
};

// Validates a slot and rejects duplicates or same-day overlaps
const validateSlot = (slot, seen, byDay) => {
  const day = parseDay(slot?.day);
  const { start, end } = parseTimeRange(slot);

  const key = `${day}-${slot.startTime}-${slot.endTime}`;
  if (seen.has(key)) {
    throw new Error(`Duplicate slot: ${day} ${slot.startTime}–${slot.endTime}`);
  }
  seen.add(key);

  checkOverlap(start, end, byDay[day] || [], day, slot.startTime, slot.endTime);

  if (!byDay[day]) byDay[day] = [];
  byDay[day].push({ start, end, startTime: slot.startTime, endTime: slot.endTime });
};

// Employee-only reusable field validators (reused by the employee/admin routes)
const usernameValidator = (field = "username", { optional = false } = {}) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain.notEmpty().withMessage("Username is required");
};

const qualificationValidator = (field = "qualification", { optional = false } = {}) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain
    .isArray({ min: 1 })
    .withMessage("At least one qualification is required");
};

const joiningDateValidator = (field = "joiningDate", { optional = false } = {}) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain
    .isISO8601()
    .toDate()
    .withMessage("Valid joining date is required");
};

// Core validators shared by employee creation (admin), admin creation (owner), and self-registration
const employeeBaseValidators = [
  usernameValidator(),
  nameValidator("name", "Name"),
  phoneValidator("phone"),
  emailValidator("email"),
  body("department").isIn(DEPARTMENTS).withMessage("Valid department is required"),
  body("designation")
    .isIn(STAFF_DESIGNATIONS)
    .withMessage("Valid designation is required")
    .bail()
    .custom((designation, { req }) => {
      const dept = req.body.department;
      const valid = DEPARTMENT_DESIGNATIONS[dept];
      if (valid && !valid.includes(designation)) {
        throw new Error(
          `Designation ${designation} is not valid for the ${dept} department`,
        );
      }
      return true;
    }),
  qualificationValidator(),

  // Medical registration number is required for medical designations
  body("medicalRegistrationNumber")
    .if((value, { req }) => MEDICAL_DESIGNATIONS_SET.has(req.body.designation))
    .notEmpty()
    .withMessage("Medical registration number is required")
    .bail()
    .matches(MED_REG_REGEX)
    .withMessage(
      "Medical registration number must start with 'MED-' followed by numbers and hyphens (e.g. MED-12345)",
    ),

  // Medical registration number must NOT be provided for non-medical designations
  body("medicalRegistrationNumber")
    .if((value, { req }) => !MEDICAL_DESIGNATIONS_SET.has(req.body.designation))
    .custom((value) => {
      if (value !== undefined && value !== null && value !== "") {
        throw new Error(
          "Medical registration number is only applicable for DOCTOR, NURSE, and PHARMACIST designations",
        );
      }
      return true;
    }),

  // Specialization is required for designations that carry one
  body("specialization")
    .if((value, { req }) => SPECIALIZATION_DESIGNATIONS_SET.has(req.body.designation))
    .notEmpty()
    .withMessage("Specialization is required"),

  // Specialization must NOT be provided for non-specialization designations
  body("specialization")
    .if((value, { req }) => !SPECIALIZATION_DESIGNATIONS_SET.has(req.body.designation))
    .custom((value) => {
      if (value !== undefined && value !== null && value !== "") {
        throw new Error(
          "Specialization is only applicable for DOCTOR and LAB_TECH designations",
        );
      }
      return true;
    }),

  // DOCTOR only fields
  body("consultationFee")
    .if(body("designation").equals("DOCTOR"))
    .notEmpty()
    .withMessage("Consultation fee is required for doctor"),

  // Consultation fee must NOT be provided for non-doctor designations
  body("consultationFee")
    .if((value, { req }) => req.body.designation !== "DOCTOR")
    .custom((value) => {
      if (value !== undefined && value !== null && value !== "") {
        throw new Error(
          "Consultation fee is only applicable for DOCTOR designation",
        );
      }
      return true;
    }),

  // Each slot must be valid, unique, and non-overlapping within a day
  body("availabilitySlots")
    .if(body("designation").equals("DOCTOR"))
    .isArray({ min: 1 })
    .withMessage("Availability slots are required for doctor")
    .bail()
    .custom((slots) => {
      const seen = new Set();
      const byDay = {};
      for (const slot of slots) {
        validateSlot(slot, seen, byDay);
      }
      return true;
    }),

  // Availability slots must NOT be provided for non-doctor designations
  body("availabilitySlots")
    .if((value, { req }) => req.body.designation !== "DOCTOR")
    .custom((value) => {
      if (Array.isArray(value) && value.length > 0) {
        throw new Error(
          "Availability slots are only applicable for DOCTOR designation",
        );
      }
      return true;
    }),
];

module.exports = {
  employeeBaseValidators,
  usernameValidator,
  qualificationValidator,
  joiningDateValidator,
};