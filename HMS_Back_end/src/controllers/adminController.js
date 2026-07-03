const User = require("../models/Users");
const Employee = require("../models/Employees");
const Appointment = require("../models/Appointments");
const AuditLog = require("../models/AuditLogs");
const ProfileChangeRequest = require("../models/ProfileChangeRequests");
const emailTemplates = require("../utils/emailTemplates");
const sendEmail = require("../utils/sendEmail");
const buildEmployeeResponse = require("../utils/buildEmployeeResponse");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const updateEmployeeData = require("../utils/updateEmployeeData");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const deleteEmployeeAccount = require("../utils/deleteEmployeeAccount");
const cancelOutOfScheduleAppointments = require("../utils/cancelOutOfScheduleAppointments");
const hasFieldChanges = require("../utils/hasFieldChanges");
const createAccountWithEmployee = require("../utils/createAccountWithEmployee");
const parsePagination = require("../utils/parsePagination");
const { RESTRICTED_ROLES_SET } = require("../constants/domain");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Editable employee fields
const EMPLOYEE_UPDATABLE_FIELDS = [
  "name",
  "phone",
  "department",
  "designation",
  "joiningDate",
  "qualification",
  "medicalRegistrationNumber",
  "specialization",
  "consultationFee",
  "availabilitySlots",
  "bookingCutoffDate",
];

const EMPLOYEE_CHANGE_OPTIONS = {
  dateFields: ["joiningDate", "bookingCutoffDate"],
  arrayKeys: { availabilitySlots: ["day", "startTime", "endTime"] },
};

// Escape user-supplied search text for safe regex matching
const escapeRegex = (value) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Fetch STAFF users with a given status (paginated) and their linked employee records
const getEmployeesByStatus = async (status, reqQuery, res) => {
  const { page, limit, skip } = parsePagination(reqQuery, 10);

  const filter = { roles: "STAFF", status };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ employeeCode: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const employeeCodes = users.map((user) => user.employeeCode);
  const employees = await Employee.find({ employeeCode: { $in: employeeCodes } }).sort({
    employeeCode: 1,
  });
  const formattedEmployees = buildEmployeeResponse(employees, users);

  return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.LIST_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalEmployees: total,
    employees: formattedEmployees,
  });
};

// Lookup a profile change request and guard that it is still PENDING
const findPendingRequest = async (requestId) => {
  const request = await ProfileChangeRequest.findOne({ requestId });
  if (!request) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.ADMIN.CHANGE_REQUEST_NOT_FOUND);
  }
  if (String(request.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.CHANGE_REQUEST_REVIEWED);
  }
  return request;
};

// Create a new STAFF employee account with a temporary password
exports.createEmployee = async (req, res) => {
  const { designation } = req.body;

  if (RESTRICTED_ROLES_SET.has(designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.INVALID_DESIGNATION);
  }

  const { employee, user } = await createAccountWithEmployee(req, { // NOSONAR: false positive; function is async but Sonar loses type info across CommonJS import
    roles: ["STAFF"],
    emailTemplate: emailTemplates.employeeCredentials,
    auditAction: "EMPLOYEE_CREATED",
    buildAuditMessage: (emp) =>
      MESSAGES.AUDIT.EMPLOYEE_CREATED(emp.name, emp.employeeCode, emp.designation),
  });

  return sendSuccess(res, STATUS.CREATED, MESSAGES.ADMIN.EMPLOYEE_CREATED, {
    user: {
      username: user.username,
      email: user.email,
      roles: user.roles,
    },
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};

// Fetch a single employee profile
exports.getEmployee = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({ employeeCode });
  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  const user = await User.findOne({ employeeCode }).select("-passwordHash");
  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  const profile = buildEmployeeProfile(employee);

  return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.RETRIEVED, {
    employee: profile,
    status: user.status,
    roles: user.roles,
    lastLoginAt: user.lastLoginAt,
  });
};

// List active STAFF employees with filters + pagination
exports.getEmployees = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);

  const status = req.query.status || "ACTIVE";
  // The employee list always returns staff only because admins live on the owner admins page
  const roleScope = ["STAFF"];

  // Employee-side filters: designation + free-text search
  const employeeMatch = { isDeleted: { $ne: true } };
  if (req.query.designation) {
    employeeMatch.designation = req.query.designation;
  }
  if (req.query.search?.trim()) {
    const regex = new RegExp(escapeRegex(req.query.search.trim()), "i");
    employeeMatch.$or = [
      { name: regex },
      { email: regex },
      { employeeCode: regex },
      { department: regex },
    ];
  }

  // Join the linked user for status/roles/lastLogin, then scope by role + status
  const [result] = await Employee.aggregate([
    { $match: employeeMatch },
    {
      $lookup: {
        from: "users",
        localField: "employeeCode",
        foreignField: "employeeCode",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.isDeleted": { $ne: true },
        "user.roles": { $in: roleScope },
        "user.status": status,
      },
    },
    { $sort: { employeeCode: 1 } },
    {
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const rows = result?.rows || [];
  const total = result?.meta?.[0]?.total || 0;

  const employees = rows.map((row) => ({
    employee: buildEmployeeProfile(row),
    status: row.user.status,
    roles: row.user.roles,
    lastLoginAt: row.user.lastLoginAt,
  }));

  return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.LIST_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalEmployees: total,
    employees,
  });
};

// List STAFF employees with PENDING account status awaiting approval
exports.getPendingEmployees = async (req, res) =>
  getEmployeesByStatus("PENDING", req.query, res);

// Approve a self-registered employee
exports.approveEmployee = async (req, res) => {
  const employeeCode = req.params.employeeCode;

  const user = await User.findOne({
    employeeCode,
  });

  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.ONLY_STAFF_APPROVED);
  }

  if (String(user.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.STATUS_NOT_PENDING);
  }

  user.status = "ACTIVE";
  user.approvedBy = req.user.employeeCode;
  user.approvedAt = new Date();

  await user.save();

  // Notify the employee that their account has been approved
  try {
    await sendEmail({
      to: user.email,
      ...emailTemplates.accountApproved(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  // Log the approval action
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_APPROVED",
    targetType: "EMPLOYEE",
    targetId: user.employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_APPROVED(user.employeeCode, user.username)
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.ACCOUNT_APPROVED, {
    user: {
      username: user.username,
      email: user.email,
    },
  });
};

// Reject a self-registration request
exports.rejectEmployee = async (req, res) => {
  const employeeCode = req.params.employeeCode;

  const user = await User.findOne({
    employeeCode,
  });

  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.ONLY_STAFF_REJECTED);
  }

  if (String(user.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.STATUS_NOT_PENDING);
  }

  // Email before deletion so the address is still reachable
  try {
    await sendEmail({
      to: user.email,
      ...emailTemplates.accountRejected(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  // Log the rejection before the record is removed
  const actor = await resolveActor(req.user);

  await recordAudit({
    actor,
    action: "EMPLOYEE_REJECTED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_REGISTRATION_REJECTED(employeeCode, user.username),
  });

  // Soft-delete the account
  await deleteEmployeeAccount(employeeCode, actor.employeeCode, { userStatus: "REJECTED" });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.REGISTRATION_REJECTED);
};

// Normalized availability fingerprint for change detection
const availabilityKey = (slots) =>
  (slots || []).map((s) => `${s.day} ${s.startTime}-${s.endTime}`).sort().join("|");

// Update mutable fields on a STAFF employee record
exports.updateEmployee = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  if (RESTRICTED_ROLES_SET.has(employee.designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.CANNOT_UPDATE_PRIVILEGED);
  }

  // Reject no-op updates so no false audit log is written
  if (!hasFieldChanges(employee, req.body, EMPLOYEE_UPDATABLE_FIELDS, EMPLOYEE_CHANGE_OPTIONS)) {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
  }

  const beforeAvailability = availabilityKey(employee.availabilitySlots);

  updateEmployeeData(employee, req.body);

  await employee.save();

  // Log the update
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_UPDATED",
    targetType: "EMPLOYEE",
    targetId: employee.employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_UPDATED(employee.name, employee.employeeCode)
  });

  // Schedule change: cancel future booked appointments that no longer fit
  if (availabilityKey(employee.availabilitySlots) !== beforeAvailability) {
    await cancelOutOfScheduleAppointments(employee, actor);
  }

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.EMPLOYEE_UPDATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};

// Soft-delete a STAFF employee and their linked user account
exports.deleteEmployee = async (req, res) => {

  const employeeCode = req.params.employeeCode;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  if (RESTRICTED_ROLES_SET.has(employee.designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.CANNOT_DELETE_PRIVILEGED);
  }

  // A doctor with BOOKED appointments cannot be deleted until the booking cutoff winds them down
  if (employee.designation === "DOCTOR") {
    const bookedCount = await Appointment.countDocuments({
      doctorEmployeeId: employeeCode,
      status: "BOOKED",
    });

    if (bookedCount > 0) {
      throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.DOCTOR_HAS_BOOKED_APPOINTMENTS);
    }
  }

  // Log before deletion so the record still exists for the message
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_DELETED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_DELETED(employee.name, employeeCode)
  });

  await deleteEmployeeAccount(employeeCode, actor.employeeCode);

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.EMPLOYEE_DELETED);
};

// Fetch paginated audit log entries with optional action filter
exports.getAuditLogs = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);

  const filter = {};

  if (req.query.action) {
    filter.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .select("-__v")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.AUDIT_LOGS_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    logs,
  });
};

// List pending profile change requests (paginated)
exports.getProfileChangeRequests = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);

  const filter = { status: "PENDING" };

  const [requests, total] = await Promise.all([
    ProfileChangeRequest.find(filter)
      .select("-__v")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProfileChangeRequest.countDocuments(filter),
  ]);

  // Normalize the Map field to a plain object for JSON serialization
  const formatted = requests.map((request) => ({
    ...request,
    requestedChanges: request.requestedChanges || {},
  }));

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUESTS_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    requests: formatted,
  });
};

// Approve profile change request
exports.approveProfileChange = async (req, res) => {
  const { requestId } = req.params;

  // Throws AppError when missing or already reviewed
  const request = await findPendingRequest(requestId);

  const employee = await Employee.findOne({
    employeeCode: request.employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  request.requestedChanges.forEach((change, field) => {
    employee[field] = change.new;
  });

  await employee.save();

  request.status = "APPROVED";
  request.reviewedBy = req.user.employeeCode;
  request.reviewedAt = new Date();
  await request.save();

  // Notify the employee of approval
  try {
    await sendEmail({
      to: employee.email,
      ...emailTemplates.profileChangeApproved(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  // Log the approval
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "PROFILE_CHANGE_APPROVED",
    targetType: "PROFILE_CHANGE_REQUEST",
    targetId: request.requestId,
    message: MESSAGES.AUDIT.PROFILE_CHANGE_APPROVED(
      request.requestId,
      employee.name,
      employee.employeeCode
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUEST_APPROVED, {
    request: {
      requestId: request.requestId,
      status: request.status,
    },
  });
};

// Reject a profile change request
exports.rejectProfileChange = async (req, res) => {
  const { requestId } = req.params;

  // Throws AppError when missing or already reviewed
  const request = await findPendingRequest(requestId);

  request.status = "REJECTED";
  request.reviewedBy = req.user.employeeCode;
  request.reviewedAt = new Date();
  await request.save();

  // Notify the employee of rejection
  try {
    await sendEmail({
      to: request.email,
      ...emailTemplates.profileChangeRejected(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  // Log the rejection
  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "PROFILE_CHANGE_REJECTED",
    targetType: "PROFILE_CHANGE_REQUEST",
    targetId: request.requestId,
    message: MESSAGES.AUDIT.PROFILE_CHANGE_REJECTED(
      request.requestId,
      request.employeeName,
      request.employeeCode
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUEST_REJECTED, {
    request: {
      requestId: request.requestId,
      status: request.status,
    },
  });
};
