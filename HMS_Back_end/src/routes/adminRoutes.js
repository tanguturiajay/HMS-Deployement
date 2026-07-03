const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/adminController");
const {
  employeeBaseValidators,
  joiningDateValidator,
} = require("../validators/employeeValidation");
const { nameValidator } = require("../validators/sharedValidators");

// All the routes require authentication and admin-level authorization
router.use(auth, authorizeRoles("OWNER", "ADMIN"));

// Full employee field set plus joining date
const employeeCreationValidation = [
  ...employeeBaseValidators,
  joiningDateValidator(),
];

// Validates the employeeCode URL parameter
const employeeCodeValidation = [
  param("employeeCode").notEmpty().withMessage("Employee Code is required"),
];

// employeeCode param plus an optional name (validated only when an update includes it)
const employeeUpdateValidation = [
  ...employeeCodeValidation,
  nameValidator("name", "Name", { optional: true }),
];

// Validates the requestId URL parameter
const requestIdValidation = [
  param("requestId").notEmpty().withMessage("Request ID is required"),
];

// Employee management routes
router.post(
  "/create-employee",
  employeeCreationValidation,
  validate,
  controller.createEmployee,
);

router.get("/employees", controller.getEmployees);

router.get(
  "/employees/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.getEmployee,
);

router.get("/pending-employees", controller.getPendingEmployees);

router.put(
  "/approve-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.approveEmployee,
);

router.put(
  "/reject-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.rejectEmployee,
);

router.put(
  "/update-employee/:employeeCode",
  employeeUpdateValidation,
  validate,
  controller.updateEmployee,
);

router.delete(
  "/delete-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.deleteEmployee,
);

// Audit log route
router.get("/audit-logs", controller.getAuditLogs);

// Profile change request routes
router.get("/profile-change-requests", controller.getProfileChangeRequests);

router.put(
  "/approve-profile-change/:requestId",
  requestIdValidation,
  validate,
  controller.approveProfileChange,
);

router.put(
  "/reject-profile-change/:requestId",
  requestIdValidation,
  validate,
  controller.rejectProfileChange,
);

module.exports = router;