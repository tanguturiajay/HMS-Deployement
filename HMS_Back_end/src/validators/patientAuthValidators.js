const { body } = require("express-validator");
const {
    nameValidator,
    phoneValidator,
    emailValidator
} = require("./sharedValidators");
const { passwordStrengthValidator } = require("./passwordValidator");
const { createPatientValidation } = require("./patientValidators");

const EMERGENCY_PHONE_MESSAGE =
    "Emergency contact number must include a country code followed by exactly 10 digits";

// Confirms the confirmPassword field matches the given password field
const matchesPassword = (passwordField) =>
    body("confirmPassword")
        .notEmpty()
        .withMessage("Confirm password is required")
        .bail()
        .custom((value, { req }) => {
            if (value !== req.body[passwordField]) {
                throw new Error("Passwords do not match");
            }
            return true;
        });

// Self-registration reuses createPatientValidation rules and adds a self-chosen password
const patientRegisterValidation = [
    ...createPatientValidation,
    passwordStrengthValidator("password"),
    matchesPassword("password")
];

// Email + password presence for login
const patientLoginValidation = [
    emailValidator("email"),
    body("password").notEmpty().withMessage("Password is required")
];

// Current password + new password strength + confirmation match
const patientChangePasswordValidation = [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    passwordStrengthValidator("newPassword"),
    matchesPassword("newPassword")
];

// Email presence for the forgot-password flow
const patientForgotPasswordValidation = [
    emailValidator("email")
];

// Reset code + new password strength + confirmation match
const patientResetPasswordValidation = [
    body("resetCode").notEmpty().withMessage("Reset code is required"),
    passwordStrengthValidator("newPassword"),
    matchesPassword("newPassword")
];

// Editable contact fields only. Identity fields (name/gender/dob) are NOT accepted.
const patientProfileUpdateValidation = [
    phoneValidator("phone", { optional: true }),
    emailValidator("email", { optional: true }),

    body("address.houseName").optional().notEmpty().withMessage("House name is required"),
    body("address.houseNumber").optional().notEmpty().withMessage("House number is required"),
    body("address.city").optional().notEmpty().withMessage("City is required"),
    body("address.postCode").optional().notEmpty().withMessage("Post code is required"),

    nameValidator("emergencyContact.contactName", "Emergency contact name", { optional: true }),
    body("emergencyContact.relationship")
        .optional()
        .notEmpty()
        .withMessage("Relationship is required"),
    phoneValidator("emergencyContact.contactNumber", {
        optional: true,
        message: EMERGENCY_PHONE_MESSAGE
    })
];

module.exports = {
    patientRegisterValidation,
    patientLoginValidation,
    patientChangePasswordValidation,
    patientForgotPasswordValidation,
    patientResetPasswordValidation,
    patientProfileUpdateValidation
};
