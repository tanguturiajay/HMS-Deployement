const sanitizeQualifications = require("./qualificationSanitizer");
const { MEDICAL_DESIGNATIONS_SET, SPECIALIZATION_DESIGNATIONS_SET } = require("../constants/domain");

// Build the employee document payload from request body
const buildEmployeeData = (data) => {
  const {
    name,
    phone,
    email,
    department,
    designation,
    joiningDate,
    qualification,
    medicalRegistrationNumber,
    specialization,
    consultationFee,
    availabilitySlots,
  } = data;

  const employeeData = {
    name,
    phone,
    email,
    department,
    designation,
    joiningDate,
    qualification: sanitizeQualifications(qualification),
  };

  // Medical registration number is only stored for medical staff
  if (MEDICAL_DESIGNATIONS_SET.has(designation)) {
    employeeData.medicalRegistrationNumber = medicalRegistrationNumber;
  }

  // Specialization is only stored for designations that carry one
  if (SPECIALIZATION_DESIGNATIONS_SET.has(designation)) {
    employeeData.specialization = specialization;
  }

  // Consultation fee and availability slots are doctor-only fields
  if (designation === "DOCTOR") {
    employeeData.consultationFee = consultationFee;
    employeeData.availabilitySlots = availabilitySlots?.map((slot) => ({
      ...slot,
      day: slot.day.toUpperCase(),
    }));
  }

  return employeeData;
};

module.exports = buildEmployeeData;