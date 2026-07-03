const { body, param, query } = require("express-validator");

// Validates patient, doctor, date, and time slot fields for appointment creation/update
const createAppointmentValidation = [
    body("patientUHID")
        .notEmpty()
        .withMessage("Patient UHID is required"),

    body("doctorEmployeeId")
        .notEmpty()
        .withMessage("Doctor's employee id is required"),

    body("appointmentDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid appointment date is required"),

    body("timeSlot")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage("Time slot must be in HH:mm-HH:mm format")
];

// Validates the doctor and date query parameters for the booked-slots lookup
const bookedSlotsValidation = [
    query("doctorEmployeeId")
        .notEmpty()
        .withMessage("doctorEmployeeId is required"),

    query("date")
        .isISO8601()
        .withMessage("Valid date is required")
];

// Validates the appointmentId URL parameter
const appointmentIdValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required")
];

// Validates the appointmentId param plus the required cancellation reason body
const cancelAppointmentValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required"),

    body("cancellationReason")
        .trim()
        .notEmpty()
        .withMessage("Cancellation reason is required")
];

module.exports = {
    createAppointmentValidation,
    bookedSlotsValidation,
    appointmentIdValidation,
    cancelAppointmentValidation
};