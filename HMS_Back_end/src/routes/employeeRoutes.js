const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const requirePermission = require("../middlewares/requirePermission");
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

// Active doctors list serving both the booking and edit flows
router.get(
    "/doctors",
    requirePermission(["CREATE_APPOINTMENT", "UPDATE_APPOINTMENT"]),
    controller.getDoctors
);

// Self update where the direct permission saves immediately and the request permission awaits approval
router.put(
    "/update-profile",
    requirePermission(["UPDATE_SELF", "UPDATE_SELF_DIRECT"]),
    profileUpdateValidation,
    validate,
    controller.profileUpdate
);

module.exports = router;