const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeNode = require("../middlewares/authorizeNode");
const requirePermission = require("../middlewares/requirePermission");
const controller = require("../controllers/ownerController");
const {
    nameValidator,
    phoneValidator,
    emailValidator,
} = require("../validators/sharedValidators");
const {
    usernameValidator,
    qualificationValidator,
    joiningDateValidator,
} = require("../validators/employeeValidation");

// The module door is driven by the Admins sidebar node while mutations need explicit permissions
router.use(auth, authorizeNode("/dashboard/admins"));

// Admin creation fields
const adminCreationValidation = [

    usernameValidator(),

    nameValidator("name", "Name"),

    phoneValidator("phone"),

    emailValidator("email"),

    body("department")
        .equals("Administration")
        .withMessage("Admin must belong to Administration department"),

    body("designation")
        .equals("ADMIN")
        .withMessage("Designation must be ADMIN"),

    joiningDateValidator(),

    qualificationValidator()
];

// Validates the employeeCode URL parameter
const employeeCodeValidation = [
    param("employeeCode")
        .notEmpty()
        .withMessage("Employee Code is required")
];

// employeeCode param plus an optional name (validated only when an update includes it)
const adminUpdateValidation = [
    ...employeeCodeValidation,
    nameValidator("name", "Name", { optional: true })
];

// Admin management routes
router.post(
    "/create-admin",
    requirePermission("CREATE_ADMIN"),
    adminCreationValidation,
    validate,
    controller.createAdmin
);

router.get(
    "/admins",
    controller.getAdmins
);

router.put(
    "/update-admin/:employeeCode",
    requirePermission("UPDATE_ADMIN"),
    adminUpdateValidation,
    validate,
    controller.updateAdmin
);

router.delete(
    "/delete-admin/:employeeCode",
    requirePermission("DELETE_ADMIN"),
    employeeCodeValidation,
    validate,
    controller.deleteAdmin
);

module.exports = router;