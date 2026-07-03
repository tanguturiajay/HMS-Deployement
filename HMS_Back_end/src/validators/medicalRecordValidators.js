const { body, param } = require("express-validator");
const {
    ADMINISTRATION_CATEGORIES,
    ADMINISTRATION_METHODS,
    ADMINISTRATION_METHODS_BY_CATEGORY,
    FOOD_RELATIONS
} = require("../constants/domain");

// Per item prescription rules that validate each field only when the item is present
const prescriptionItemValidation = [
    body("prescriptionItems.*.name")
        .trim()
        .notEmpty()
        .withMessage("Prescription item name is required"),

    body("prescriptionItems.*.dosage")
        .trim()
        .notEmpty()
        .withMessage("Prescription item dosage is required"),

    body("prescriptionItems.*.frequency")
        .trim()
        .notEmpty()
        .withMessage("Prescription item frequency is required"),

    body("prescriptionItems.*.duration")
        .trim()
        .notEmpty()
        .withMessage("Prescription item duration is required"),

    body("prescriptionItems.*.administrationCategory")
        .isIn(ADMINISTRATION_CATEGORIES)
        .withMessage("Invalid administration category"),

    body("prescriptionItems.*.administrationMethod")
        .isIn(ADMINISTRATION_METHODS)
        .withMessage("Invalid administration method"),

    body("prescriptionItems.*.foodTiming.relation")
        .optional()
        .isIn(FOOD_RELATIONS)
        .withMessage("Food timing relation must be BEFORE_FOOD or AFTER_FOOD"),

    body("prescriptionItems.*.foodTiming.offsetMinutes")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Food timing offset must be a non-negative number of minutes"),

    // Cross-field: the chosen method must belong to the chosen category
    body("prescriptionItems")
        .optional()
        .custom((items) => {
            if (!Array.isArray(items)) {
                return true;
            }
            const allValid = items.every((item) => {
                if (item?.administrationCategory === undefined) {
                    return true;
                }
                const methods = ADMINISTRATION_METHODS_BY_CATEGORY[item.administrationCategory] || [];
                return methods.includes(item.administrationMethod);
            });
            if (!allValid) {
                throw new Error("Administration method does not belong to the selected category");
            }
            return true;
        })
];

// Per item observation rules that require a valid clinician supplied recordedTime when present
const medicalObservationValidation = [
    body("medicalObservations.*.metricName")
        .trim()
        .notEmpty()
        .withMessage("Observation metric name is required"),

    body("medicalObservations.*.metricValue")
        .trim()
        .notEmpty()
        .withMessage("Observation metric value is required"),

    body("medicalObservations.*.recordedTime")
        .notEmpty()
        .withMessage("Observation recorded time is required")
        .bail()
        .isISO8601()
        .withMessage("Observation recorded time must be a valid date")
];

// Validates fields for medical record creation
const createMedicalRecordValidation = [
    body("appointmentId")
        .trim()
        .notEmpty()
        .withMessage("Appointment id is required"),

    body("chiefComplaint")
        .trim()
        .notEmpty()
        .withMessage("Chief complaint is required"),

    body("symptoms")
        .trim()
        .notEmpty()
        .withMessage("Symptoms are required"),

    body("diagnosis")
        .trim()
        .notEmpty()
        .withMessage("Diagnosis is required"),

    body("advice")
        .trim()
        .notEmpty()
        .withMessage("Advice is required"),

    body("prescriptionItems")
        .optional()
        .isArray()
        .withMessage("Prescription items must be an array"),

    ...prescriptionItemValidation,

    body("medicalObservations")
        .optional()
        .isArray()
        .withMessage("Medical observations must be an array"),

    ...medicalObservationValidation,

    body("notes")
        .optional()
        .trim(),

    body("status")
        .optional()
        .isIn(["DRAFT", "FINALIZED"])
        .withMessage("Status must be DRAFT or FINALIZED")
];

// Validates fields for medical record update (partial; finalize allowed for doctor)
const updateMedicalRecordValidation = [
    param("medicalRecordId")
        .notEmpty()
        .withMessage("Medical record id is required"),

    body("chiefComplaint")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Chief complaint cannot be empty"),

    body("symptoms")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Symptoms cannot be empty"),

    body("diagnosis")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Diagnosis cannot be empty"),

    body("advice")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Advice cannot be empty"),

    body("prescriptionItems")
        .optional()
        .isArray()
        .withMessage("Prescription items must be an array"),

    ...prescriptionItemValidation,

    body("medicalObservations")
        .optional()
        .isArray()
        .withMessage("Medical observations must be an array"),

    ...medicalObservationValidation,

    body("notes")
        .optional()
        .trim(),

    body("status")
        .optional()
        .isIn(["DRAFT", "FINALIZED"])
        .withMessage("Status must be DRAFT or FINALIZED")
];

// Validates the medicalRecordId URL parameter
const medicalRecordIdValidation = [
    param("medicalRecordId")
        .notEmpty()
        .withMessage("Medical record id is required")
];

// Validates the appointmentId URL parameter
const appointmentIdParamValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required")
];

module.exports = {
    createMedicalRecordValidation,
    updateMedicalRecordValidation,
    medicalRecordIdValidation,
    appointmentIdParamValidation
};
