const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const patientAuth = require("../middlewares/patientAuthMiddleware");
const controller = require("../controllers/patientSelfController");
const {
    patientProfileUpdateValidation
} = require("../validators/patientAuthValidators");
const {
    patientBookAppointmentValidation,
    patientAppointmentIdValidation,
    patientCancelAppointmentValidation
} = require("../validators/patientAppointmentValidators");

// Every route here requires a valid patient token
router.use(patientAuth);

// Profile
router.get("/me", controller.getMyProfile);

router.put(
    "/me",
    patientProfileUpdateValidation,
    validate,
    controller.updateMyProfile
);

// Booking helpers
router.get("/doctors", controller.getDoctors);
router.get("/booked-slots", controller.getBookedSlots);

// Appointments
router.get("/appointments", controller.getMyAppointments);

router.post(
    "/appointments",
    patientBookAppointmentValidation,
    validate,
    controller.bookAppointment
);

router.put(
    "/appointments/:appointmentId",
    [...patientAppointmentIdValidation, ...patientBookAppointmentValidation],
    validate,
    controller.updateMyAppointment
);

router.put(
    "/appointments/:appointmentId/cancel",
    patientCancelAppointmentValidation,
    validate,
    controller.cancelMyAppointment
);

// Medical records (read-only, finalized records only)
router.get("/medical-records", controller.getMyMedicalRecords);
router.get(
    "/medical-records/by-appointment/:appointmentId",
    controller.getMyMedicalRecordByAppointment
);
router.get("/medical-records/:medicalRecordId", controller.getMyMedicalRecordById);

module.exports = router;
