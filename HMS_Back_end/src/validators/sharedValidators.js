const { body } = require("express-validator");

// Name: letters, spaces, hyphens, apostrophes, periods
const NAME_REGEX = /^\p{L}[\p{L} .'-]*$/u;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

// Name validation chain
const nameValidator = (field = "name", label = "Name", { optional = false } = {}) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isLength({ min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH })
    .withMessage(`${label} must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`)
    .matches(NAME_REGEX)
    .withMessage(
      `${label} may only contain letters, spaces, hyphens, apostrophes and periods`,
    );
};

// Phone: optional country code, then 10 digits
const PHONE_REGEX = /^(\+\d{1,3} )?\d{10}$/;

const PHONE_DEFAULT_MESSAGE =
  "Phone must be 10 digits, optionally prefixed with a country code and a space (e.g. +91 1234567890 or 1234567890)";

// Phone validation chain
const phoneValidator = (
  field = "phone",
  { optional = false, message = PHONE_DEFAULT_MESSAGE } = {},
) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain.matches(PHONE_REGEX).withMessage(message);
};

// Email validation chain
const emailValidator = (field = "email", { optional = false } = {}) => {
  const chain = body(field);
  if (optional) {
    chain.optional();
  }
  return chain.isEmail().withMessage("Valid email is required");
};

module.exports = {
  nameValidator,
  phoneValidator,
  emailValidator,
  NAME_REGEX,
  PHONE_REGEX,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
};
