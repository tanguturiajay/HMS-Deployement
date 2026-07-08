const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeNode = require("../middlewares/authorizeNode");
const requirePermission = require("../middlewares/requirePermission");
const controller = require("../controllers/appointmentController");
const {
    createAppointmentValidation,
    bookedSlotsValidation,
    appointmentIdValidation,
    cancelAppointmentValidation
} = require("../validators/appointmentValidators");

// The module door is driven by the Appointments sidebar node while per-action permissions stay layered on top
router.use(auth, authorizeNode("/dashboard/appointments"));

// Viewing is scope-split so holders of only the my-scope see just their own appointments
const VIEW_LEVEL = requirePermission([
    "VIEW_ALL_APPOINTMENTS",
    "VIEW_MY_APPOINTMENTS"
]);

// Slots and doctor lookups serve both the booking and edit flows
const BOOKING_LEVEL = requirePermission([
    "CREATE_APPOINTMENT",
    "UPDATE_APPOINTMENT"
]);

// Appointment CRUD routes
router.post(
    "/create-appointment",
    requirePermission("CREATE_APPOINTMENT"),
    createAppointmentValidation,
    validate,
    controller.createAppointment
);

router.get(
    "/my",
    requirePermission("VIEW_MY_APPOINTMENTS"),
    controller.getMyAppointments
);

router.get(
    "/booked-slots",
    BOOKING_LEVEL,
    bookedSlotsValidation,
    validate,
    controller.getBookedSlots
);

router.get(
    "/",
    VIEW_LEVEL,
    controller.getAppointments
);

router.get(
    "/:appointmentId",
    VIEW_LEVEL,
    appointmentIdValidation,
    validate,
    controller.getAppointmentById
);

router.put(
    "/:appointmentId",
    requirePermission("UPDATE_APPOINTMENT"),
    [...appointmentIdValidation, ...createAppointmentValidation],
    validate,
    controller.updateAppointment
);

router.put(
    "/:appointmentId/cancel",
    requirePermission("CANCEL_APPOINTMENT"),
    cancelAppointmentValidation,
    validate,
    controller.cancelAppointment
);

router.put(
    "/:appointmentId/unattended",
    requirePermission("MARK_APPOINTMENT_UNATTENDED"),
    appointmentIdValidation,
    validate,
    controller.markUnattended
);

module.exports = router;