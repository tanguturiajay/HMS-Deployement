const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeNode = require("../middlewares/authorizeNode");
const requirePermission = require("../middlewares/requirePermission");
const controller = require("../controllers/medicalRecordController");
const {
    createMedicalRecordValidation,
    updateMedicalRecordValidation,
    medicalRecordIdValidation,
    appointmentIdParamValidation
} = require("../validators/medicalRecordValidators");

// The module door is driven by the Medical Records sidebar node while workflow permissions stay layered on top
router.use(auth, authorizeNode("/dashboard/medical-records"));

// Viewing is scope-split so holders of only the my-scope see just their own records
const VIEW_LEVEL = requirePermission([
    "VIEW_ALL_MEDICAL_RECORDS",
    "VIEW_MY_MEDICAL_RECORDS"
]);

// The controller enforces the exact code once the requested status is known
const CREATE_LEVEL = requirePermission([
    "CREATE_MEDICAL_RECORD_DRAFT",
    "CREATE_AND_FINALIZE_MEDICAL_RECORD"
]);

const UPDATE_LEVEL = requirePermission([
    "CREATE_MEDICAL_RECORD_DRAFT",
    "VERIFY_AND_FINALIZE_MEDICAL_RECORD"
]);

router.post(
    "/",
    CREATE_LEVEL,
    createMedicalRecordValidation,
    validate,
    controller.createMedicalRecord
);

router.get(
    "/",
    VIEW_LEVEL,
    controller.listMedicalRecords
);

router.get(
    "/by-appointment/:appointmentId",
    VIEW_LEVEL,
    appointmentIdParamValidation,
    validate,
    controller.getMedicalRecordByAppointment
);

router.get(
    "/:medicalRecordId",
    VIEW_LEVEL,
    medicalRecordIdValidation,
    validate,
    controller.getMedicalRecordById
);

router.put(
    "/:medicalRecordId",
    UPDATE_LEVEL,
    updateMedicalRecordValidation,
    validate,
    controller.updateMedicalRecord
);

router.delete(
    "/:medicalRecordId",
    requirePermission("DELETE_MEDICAL_RECORD"),
    medicalRecordIdValidation,
    validate,
    controller.deleteMedicalRecord
);

module.exports = router;