const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const authorizeNode = require("../middlewares/authorizeNode");
const controller = require("../controllers/medicalRecordController");
const {
    createMedicalRecordValidation,
    updateMedicalRecordValidation,
    medicalRecordIdValidation,
    appointmentIdParamValidation
} = require("../validators/medicalRecordValidators");

// Module door is driven by the Medical Records sidebar node; delete keeps its own check
router.use(auth, authorizeNode("/dashboard/medical-records"));

// Only Admin/Owner may delete (soft delete)
const DELETE_LEVEL = authorizeDesignation("OWNER", "ADMIN");

router.post(
    "/",
    createMedicalRecordValidation,
    validate,
    controller.createMedicalRecord
);

router.get(
    "/",
    controller.listMedicalRecords
);

router.get(
    "/by-appointment/:appointmentId",
    appointmentIdParamValidation,
    validate,
    controller.getMedicalRecordByAppointment
);

router.get(
    "/:medicalRecordId",
    medicalRecordIdValidation,
    validate,
    controller.getMedicalRecordById
);

router.put(
    "/:medicalRecordId",
    updateMedicalRecordValidation,
    validate,
    controller.updateMedicalRecord
);

router.delete(
    "/:medicalRecordId",
    DELETE_LEVEL,
    medicalRecordIdValidation,
    validate,
    controller.deleteMedicalRecord
);

module.exports = router;
