const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeNode = require("../middlewares/authorizeNode");
const requirePermission = require("../middlewares/requirePermission");
const controller = require("../controllers/patientController");
const {
    createPatientValidation,
    updatePatientValidation,
    uhidValidation
} = require("../validators/patientValidators");

// The module door is driven by the Patients sidebar node and grants view only while mutations need explicit permissions
router.use(auth, authorizeNode("/dashboard/patients"));

// Patient CRUD routes
router.post(
    "/create-patient",
    requirePermission("CREATE_PATIENT"),
    createPatientValidation,
    validate,
    controller.createPatient
);

// Search must precede /:UHID to avoid the param route capturing "search"
router.get(
    "/search",
    controller.searchPatients
);

router.get(
    "/",
    controller.getPatients
);

router.get(
    "/:UHID",
    uhidValidation,
    validate,
    controller.getPatientById
);

router.put(
    "/:UHID",
    requirePermission("UPDATE_PATIENT"),
    updatePatientValidation,
    validate,
    controller.updatePatient
);

router.delete(
    "/:UHID",
    requirePermission("DELETE_PATIENT"),
    uhidValidation,
    validate,
    controller.deletePatient
);

module.exports = router;