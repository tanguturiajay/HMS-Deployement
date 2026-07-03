const { body } = require("express-validator");

// Returns an express-validator chain that enforces password strength rules for the given field
const passwordStrengthValidator = (fieldName) =>
  body(fieldName)
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character");

module.exports = { passwordStrengthValidator };