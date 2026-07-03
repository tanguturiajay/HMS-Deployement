const { body, param } = require("express-validator");
const {
    nameValidator,
    phoneValidator,
    emailValidator,
} = require("./sharedValidators");

const EMERGENCY_PHONE_MESSAGE =
    "Emergency contact number must include a country code followed by exactly 10 digits";

const allowedGenders = new Set([
    "Male",
    "Female"
]);

// Validates all required fields for creating a new patient record
const createPatientValidation = [
    nameValidator("name", "Patient name"),

    phoneValidator("phone"),

    emailValidator("email"),

    body("gender")
        .isIn([...allowedGenders])
        .withMessage("Valid gender is required"),

    body("dob")
        .isISO8601()
        .toDate()
        .withMessage("Valid date of birth is required"),

    body("address.houseName")
        .notEmpty()
        .withMessage("House name is required"),

    body("address.houseNumber")
        .notEmpty()
        .withMessage("House number is required"),

    body("address.city")
        .notEmpty()
        .withMessage("City is required"),

    body("address.postCode")
        .notEmpty()
        .withMessage("Post code is required"),

    nameValidator("emergencyContact.contactName", "Emergency contact name"),

    body("emergencyContact.relationship")
        .notEmpty()
        .withMessage("Relationship is required"),

    phoneValidator("emergencyContact.contactNumber", { message: EMERGENCY_PHONE_MESSAGE })
];

// Validates the UHID param and all optional body fields for patient updates
const updatePatientValidation = [
    param("UHID")
        .notEmpty()
        .withMessage("UHID is required"),

    nameValidator("name", "Patient name", { optional: true }),

    phoneValidator("phone", { optional: true }),

    emailValidator("email", { optional: true }),

    body("gender")
        .optional()
        .isIn([...allowedGenders])
        .withMessage("Valid gender is required"),

    body("dob")
        .optional()
        .isISO8601()
        .toDate()
        .withMessage("Valid date of birth is required"),

    body("status")
        .optional()
        .isIn(["ACTIVE", "INACTIVE"])
        .withMessage("Valid status is required"),

    phoneValidator("emergencyContact.contactNumber", { optional: true, message: EMERGENCY_PHONE_MESSAGE })
];

// Validates the UHID URL parameter
const uhidValidation = [
    param("UHID")
        .notEmpty()
        .withMessage("UHID is required")
];

module.exports = {
    createPatientValidation,
    updatePatientValidation,
    uhidValidation
};