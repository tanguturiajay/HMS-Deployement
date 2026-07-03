const Employee = require("../models/Employees");
const User = require("../models/Users");
const emailTemplates = require("../utils/emailTemplates");
const buildEmployeeResponse = require("../utils/buildEmployeeResponse");
const updateEmployeeData = require("../utils/updateEmployeeData");
const hasFieldChanges = require("../utils/hasFieldChanges");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const createAccountWithEmployee = require("../utils/createAccountWithEmployee");
const deleteEmployeeAccount = require("../utils/deleteEmployeeAccount");
const parsePagination = require("../utils/parsePagination");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Create an ADMIN account with a temporary password
const createAdmin = async (req, res) => {
  const { employee, user } = await createAccountWithEmployee(req, { // NOSONAR: false positive; function is async but Sonar loses type info across CommonJS require
    roles: ["ADMIN"],
    emailTemplate: emailTemplates.adminCredentials,
    auditAction: "ADMIN_CREATED",
    buildAuditMessage: (emp) =>
      MESSAGES.AUDIT.ADMIN_CREATED(emp.name, emp.employeeCode),
  });

  return sendSuccess(res, STATUS.CREATED, MESSAGES.OWNER.ADMIN_CREATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
    },
    user: {
      username: user.username,
      roles: user.roles,
      status: user.status,
    },
  });
};

// List admin users with their linked employee records (paginated)
const getAdmins = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);

  const filter = { roles: "ADMIN" };

  const [admins, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const employeeCodes = admins.map((admin) => admin.employeeCode);

  const employees = await Employee.find({
    employeeCode: {
      $in: employeeCodes,
    },
  }).sort({ employeeCode: 1 });

  const formattedAdmins = buildEmployeeResponse(employees, admins);

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMINS_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalAdmins: total,
    admins: formattedAdmins,
  });
};

// Update mutable fields on an admin employee record
const updateAdmin = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.OWNER.ADMIN_NOT_FOUND);
  }

  // Reject no-op updates so no false audit log is written
  const adminFields = ["name", "phone", "department", "designation", "joiningDate", "qualification"];
  if (!hasFieldChanges(employee, req.body, adminFields, { dateFields: ["joiningDate"] })) {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
  }

  updateEmployeeData(employee, req.body);

  await employee.save();

  // Log the update
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "ADMIN_UPDATED",
    targetType: "EMPLOYEE",
    targetId: employee.employeeCode,
    message: MESSAGES.AUDIT.ADMIN_UPDATED(employee.name, employee.employeeCode)
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMIN_UPDATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};

// Delete an admin account
const deleteAdmin = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.OWNER.ADMIN_NOT_FOUND);
  }

  if (employee.designation === "OWNER") {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.OWNER.CANNOT_DELETE_OWNER);
  }

  // Log before deletion so the record still exists for the message
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "ADMIN_DELETED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.ADMIN_DELETED(employee.name, employeeCode)
  });

  await deleteEmployeeAccount(employeeCode, actor.employeeCode);

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMIN_DELETED);
};

module.exports = {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
};
