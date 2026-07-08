const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeNode = require("../middlewares/authorizeNode");
const requirePermission = require("../middlewares/requirePermission");
const controller = require("../controllers/adminController");
const {
  employeeBaseValidators,
  joiningDateValidator,
} = require("../validators/employeeValidation");
const { nameValidator } = require("../validators/sharedValidators");

// All the routes require authentication
router.use(auth);

// Module doors driven by the Employees and Approvals sidebar nodes while mutations need explicit permissions
const EMPLOYEES_DOOR = authorizeNode("/dashboard/employees");
const APPROVALS_DOOR = authorizeNode("/dashboard/approvals");

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
  EMPLOYEES_DOOR,
  requirePermission("CREATE_EMPLOYEE"),
  employeeCreationValidation,
  validate,
  controller.createEmployee,
);

router.get("/employees", EMPLOYEES_DOOR, controller.getEmployees);

router.get(
  "/employees/:employeeCode",
  EMPLOYEES_DOOR,
  employeeCodeValidation,
  validate,
  controller.getEmployee,
);

router.get("/pending-employees", APPROVALS_DOOR, controller.getPendingEmployees);

router.put(
  "/approve-employee/:employeeCode",
  APPROVALS_DOOR,
  requirePermission("APPROVE_EMPLOYEE"),
  employeeCodeValidation,
  validate,
  controller.approveEmployee,
);

router.put(
  "/reject-employee/:employeeCode",
  APPROVALS_DOOR,
  requirePermission("REJECT_EMPLOYEE"),
  employeeCodeValidation,
  validate,
  controller.rejectEmployee,
);

router.put(
  "/update-employee/:employeeCode",
  EMPLOYEES_DOOR,
  requirePermission("UPDATE_EMPLOYEE"),
  employeeUpdateValidation,
  validate,
  controller.updateEmployee,
);

router.delete(
  "/delete-employee/:employeeCode",
  EMPLOYEES_DOOR,
  requirePermission("DELETE_EMPLOYEE"),
  employeeCodeValidation,
  validate,
  controller.deleteEmployee,
);

// Audit feed renders on the Overview page, so only the permission gates it
router.get("/audit-logs", requirePermission("VIEW_AUDIT_LOGS"), controller.getAuditLogs);

// Profile change request routes
router.get("/profile-change-requests", APPROVALS_DOOR, controller.getProfileChangeRequests);

router.put(
  "/approve-profile-change/:requestId",
  APPROVALS_DOOR,
  requirePermission("APPROVE_PROFILE_CHANGE"),
  requestIdValidation,
  validate,
  controller.approveProfileChange,
);

router.put(
  "/reject-profile-change/:requestId",
  APPROVALS_DOOR,
  requirePermission("REJECT_PROFILE_CHANGE"),
  requestIdValidation,
  validate,
  controller.rejectProfileChange,
);

module.exports = router;