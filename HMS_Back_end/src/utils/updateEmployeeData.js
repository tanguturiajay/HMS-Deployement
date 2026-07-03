const sanitizeQualifications = require("./qualificationSanitizer");
const AppError = require("./AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
const { SPECIALIZATION_DESIGNATIONS_SET } = require("../constants/domain");

const doctorOnlyFields = new Set(["consultationFee", "availabilitySlots", "bookingCutoffDate"]);

// Midnight epoch ms for the given date, for whole-day comparisons
const startOfDayMs = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Apply allowed field updates to an employee document, enforcing designation-based restrictions
const updateEmployeeData = (employee, updateData) => {
  const allowedFields = [
    "name",
    "phone",
    "department",
    "designation",
    "joiningDate",
    "qualification",
    "medicalRegistrationNumber",
    "specialization",
    "consultationFee",
    "availabilitySlots",
    "bookingCutoffDate",
  ];

  // Joining date is locked once reached (on or after the day itself); only block an actual change
  if (updateData.joiningDate !== undefined && employee.joiningDate) {
    const todayStart = startOfDayMs(new Date());
    const currentJoin = startOfDayMs(employee.joiningDate);
    const incomingJoin = startOfDayMs(updateData.joiningDate);
    if (currentJoin <= todayStart && incomingJoin !== currentJoin) {
      throw new AppError(STATUS.BAD_REQUEST, MESSAGES.EMPLOYEE.JOINING_DATE_LOCKED);
    }
  }

  // Use the incoming designation if provided, otherwise keep the existing one
  const updatedDesignation = updateData.designation || employee.designation;

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {

      if (field === "qualification") {
        employee[field] = sanitizeQualifications(updateData[field]);

        return;
      }

      // Ignore specialization if the (new) designation does not support it
      if (
        field === "specialization" &&
        !SPECIALIZATION_DESIGNATIONS_SET.has(updatedDesignation)
      ) {
        return;
      }

      // Ignore doctor-only fields if the (new) designation is not DOCTOR
      if (doctorOnlyFields.has(field) && updatedDesignation !== "DOCTOR") {
        return;
      }

      employee[field] = updateData[field];
    }
  });

  // Clear specialization when the designation no longer supports it
  if (!SPECIALIZATION_DESIGNATIONS_SET.has(updatedDesignation)) {
    employee.specialization = undefined;
  }

  // Clear doctor-only fields when the designation is no longer DOCTOR
  if (updatedDesignation !== "DOCTOR") {
    employee.consultationFee = undefined;
    employee.availabilitySlots = undefined;
    employee.bookingCutoffDate = undefined;
  }

  return employee;
};

module.exports = updateEmployeeData;