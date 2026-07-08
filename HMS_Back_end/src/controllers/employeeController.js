const User = require("../models/Users");
const Employee = require("../models/Employees");
const ProfileChangeRequest = require("../models/ProfileChangeRequests");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const getCurrentUser = require("../utils/getCurrentUser");
const { hasPermission } = require("../middlewares/requirePermission");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Fields an employee is allowed to self-update
const SELF_EDITABLE_FIELDS = ["phone", "qualification"];

// Get current authenticated user + profile
exports.getMe = async (req, res) => {

    const user = await getCurrentUser(req.user.employeeCode);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.USER_RETRIEVED, {
        user
    });
};

// Get all active doctors
exports.getDoctors = async (req, res) => {

    // Active doctor users
    const users = await User.find({
        status: "ACTIVE"
    }).select("employeeCode");

    const activeCodes = users.map((u) => u.employeeCode);

    const doctors = await Employee.find({
        designation: "DOCTOR",
        employeeCode: { $in: activeCodes }
    }).select(
        "employeeCode name specialization department consultationFee availabilitySlots qualification joiningDate bookingCutoffDate"
    );

    return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.DOCTORS_RETRIEVED, {
        total: doctors.length,
        doctors
    });
};

// Submit a profile change request
exports.profileUpdate = async (req, res) => {

    const employee = await Employee.findOne({
        employeeCode: req.user.employeeCode
    });

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    // Build the diff of requested changes for allowed fields only
    const requestedChanges = {};

    SELF_EDITABLE_FIELDS.forEach((field) => {
        if (req.body[field] === undefined) {
            return;
        }

        const oldValue = employee[field];
        const newValue = req.body[field];

        // Normalize arrays/values for comparison
        const isDifferent =
            JSON.stringify(oldValue) !== JSON.stringify(newValue);

        if (isDifferent) {
            requestedChanges[field] = {
                old: oldValue,
                new: newValue
            };
        }
    });

    if (Object.keys(requestedChanges).length === 0) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.EMPLOYEE.NO_VALID_CHANGES);
    }

    // The direct permission saves immediately, no wait for approval
    const isPrivileged = await hasPermission(req, "UPDATE_SELF_DIRECT");

    if (isPrivileged) {
        Object.keys(requestedChanges).forEach((field) => {
            employee[field] = requestedChanges[field].new;
        });

        await employee.save();

        // Record audit
        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "PROFILE_UPDATED",
            targetType: "EMPLOYEE",
            targetId: employee.employeeCode,
            message: MESSAGES.AUDIT.EMPLOYEE_PROFILE_UPDATED(
                employee.name,
                employee.employeeCode
            )
        });

        return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.PROFILE_UPDATED, {
            employee: buildEmployeeProfile(employee)
        });
    }

    // Prevent duplicate pending requests
    const existingPending = await ProfileChangeRequest.findOne({
        employeeCode: employee.employeeCode,
        status: "PENDING"
    });

    if (existingPending) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.PENDING_REQUEST_EXISTS);
    }

    const request = await ProfileChangeRequest.create({
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        email: employee.email,
        requestedChanges
    });

    if (!request) {
        throw new Error("Failed to create profile change request");
    }

    // Notify admins
    try {
        const admins = await User.find({
            roles: { $in: ["ADMIN", "OWNER"] },
            status: "ACTIVE"
        }).select("email");

        const adminEmails = admins.map((a) => a.email);

        if (adminEmails.length) {
            await sendEmail({
                to: adminEmails,
                ...emailTemplates.profileChangeRequest({
                    name: employee.name,
                    employeeCode: employee.employeeCode
                })
            });
        }
    } catch (emailError) {
        console.error("Admin notification email error:", emailError);
    }

    // Record audit
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "PROFILE_CHANGE_REQUESTED",
        targetType: "PROFILE_CHANGE_REQUEST",
        targetId: request.requestId,
        message: MESSAGES.AUDIT.PROFILE_CHANGE_REQUESTED(
            employee.name,
            employee.employeeCode
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.EMPLOYEE.CHANGE_REQUEST_SUBMITTED, {
        request: {
            requestId: request.requestId,
            status: request.status,
            requestedChanges
        }
    });
};