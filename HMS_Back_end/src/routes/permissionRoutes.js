const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/permissionController");
const { PERMISSION_DESIGNATIONS, ALL_PERMISSIONS } = require("../constants/permissions");

// All the routes require authentication
router.use(auth);

// Validates the target designation and that every code exists in the catalog
const updatePermissionsValidation = [

    param("designation")
        .isIn(PERMISSION_DESIGNATIONS)
        .withMessage("Valid designation is required"),

    body("permissions")
        .isArray()
        .withMessage("Permissions must be an array"),

    body("permissions.*")
        .isIn(ALL_PERMISSIONS)
        .withMessage("Valid permission code is required")
];

// Permission management routes (OWNER only — admins are intentionally excluded)
router.get(
    "/",
    authorizeRoles("OWNER"),
    controller.getPermissions
);

router.put(
    "/update-permissions/:designation",
    authorizeRoles("OWNER"),
    updatePermissionsValidation,
    validate,
    controller.updatePermissions
);

// Returns the effective permissions of the authenticated user
router.get(
    "/my-permissions",
    controller.getMyPermissions
);

module.exports = router;