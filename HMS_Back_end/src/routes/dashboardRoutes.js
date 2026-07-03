const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/dashboardController");

// All the routes require authentication
router.use(auth);

// General dashboard stats (role-specific)
router.get(
    "/stats",
    controller.getDashboardStats
);

// Admin dashboard stats
router.get(
    "/admin/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getAdminDashboardStats
);

// Doctor dashboard stats
router.get(
    "/doctor/stats",
    authorizeDesignation("DOCTOR"),
    controller.getDoctorDashboardStats
);

// Receptionist dashboard stats
router.get(
    "/receptionist/stats",
    authorizeDesignation("RECEPTIONIST"),
    controller.getReceptionistDashboardStats
);

// Appointment statistics
router.get(
    "/appointments/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getAppointmentStats
);

// Patient statistics
router.get(
    "/patients/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getPatientStats
);

// Employee statistics
router.get(
    "/employees/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getEmployeeStats
);

module.exports = router;