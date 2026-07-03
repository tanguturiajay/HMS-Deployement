const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/employeeController");
const { phoneValidator } = require("../validators/sharedValidators");
const { qualificationValidator } = require("../validators/employeeValidation");

// All the routes require authentication
router.use(auth);

const profileUpdateValidation = [
    phoneValidator("phone", { optional: true }),
    qualificationValidator("qualification", { optional: true })
];

// Current authenticated user + profile
router.get(
    "/me",
    controller.getMe
);

// Active doctors list (for appointment booking dropdown)
router.get(
    "/doctors",
    authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST"),
    controller.getDoctors
);

// Submit a profile change request (admin approval required)
router.put(
    "/update-profile",
    profileUpdateValidation,
    validate,
    controller.profileUpdate
);

module.exports = router;