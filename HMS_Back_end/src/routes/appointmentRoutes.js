const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const authorizeNode = require("../middlewares/authorizeNode");
const controller = require("../controllers/appointmentController");
const {
    createAppointmentValidation,
    bookedSlotsValidation,
    appointmentIdValidation,
    cancelAppointmentValidation
} = require("../validators/appointmentValidators");

// The module door is driven by the Appointments sidebar node while stricter sub action rules stay layered on top
router.use(auth, authorizeNode("/dashboard/appointments"));

// Create/booking is reception-level even for designations granted the module
const RECEPTION_LEVEL = authorizeDesignation(
    "OWNER",
    "ADMIN",
    "RECEPTIONIST"
);

// A doctor's own-appointments feed
const DOCTOR_LEVEL = authorizeDesignation("DOCTOR");

// Appointment CRUD routes
router.post(
    "/create-appointment",
    RECEPTION_LEVEL,
    createAppointmentValidation,
    validate,
    controller.createAppointment
);

router.get(
    "/my",
    DOCTOR_LEVEL,
    controller.getMyAppointments
);

router.get(
    "/booked-slots",
    RECEPTION_LEVEL,
    bookedSlotsValidation,
    validate,
    controller.getBookedSlots
);

router.get(
    "/",
    controller.getAppointments
);

router.get(
    "/:appointmentId",
    appointmentIdValidation,
    validate,
    controller.getAppointmentById
);

router.put(
    "/:appointmentId",
    [...appointmentIdValidation, ...createAppointmentValidation],
    validate,
    controller.updateAppointment
);

router.put(
    "/:appointmentId/cancel",
    cancelAppointmentValidation,
    validate,
    controller.cancelAppointment
);

router.put(
    "/:appointmentId/unattended",
    appointmentIdValidation,
    validate,
    controller.markUnattended
);

module.exports = router;