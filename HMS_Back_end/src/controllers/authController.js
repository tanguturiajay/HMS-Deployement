const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const {
    signAccessToken,
    issueRefreshToken,
    rotateRefreshToken,
    findByHash,
    revokeByHash,
    revokeAllForSubject,
    hashToken
} = require("../utils/tokenService");
const { setRefreshCookie, clearRefreshCookie } = require("../utils/refreshCookie");
const User = require("../models/Users");
const Employee = require("../models/Employees");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const buildEmployeeData = require("../utils/buildEmployeeData");
const validateUniqueEmployeeFields = require("../validators/validateUniqueEmployeeFields");
const getCurrentUser = require("../utils/getCurrentUser");
const getEffectivePermissions = require("../utils/getEffectivePermissions");
const recordAudit = require("../utils/recordAudit");
const { RESTRICTED_ROLES_SET } = require("../constants/domain");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
require("dotenv").config();

// Authenticate a user and return a JWT with their roles
exports.login = async (req, res) => {

    const { email, password } = req.body;

    // Records a failed attempt before the request is rejected
    const auditFailedLogin = (actorType, actorId) =>
        recordAudit({
            actorType,
            actorId,
            action: "USER_LOGIN_FAILED",
            ipAddress: req.ip,
            message: MESSAGES.AUDIT.USER_LOGIN_FAILED(email)
        });

    const user = await User.findOne({ email });
    if (!user) {
        await auditFailedLogin("ANONYMOUS", email);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isMatch = Boolean(await bcrypt.compare(password, user.passwordHash));
    if (!isMatch) {
        await auditFailedLogin("ANONYMOUS", email);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Block login for non-ACTIVE accounts with a status-specific message
    const blockedStatuses = {
        PENDING: MESSAGES.AUTH.APPROVAL_PENDING,
        REJECTED: MESSAGES.AUTH.REGISTRATION_REJECTED,
        INACTIVE: MESSAGES.AUTH.ACCOUNT_INACTIVE
    };

    const blockedMessage = blockedStatuses[user.status];

    if (blockedMessage) {
        await auditFailedLogin("EMPLOYEE", user.employeeCode);
        throw new AppError(STATUS.FORBIDDEN, blockedMessage);
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Load the linked employee profile to include in the response
    const employee = await Employee.findOne({
        employeeCode: user.employeeCode
    }).select("-__v");

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.EMPLOYEE_PROFILE_NOT_FOUND);
    }

    const profile = buildEmployeeProfile(employee);
    const permissions = await getEffectivePermissions(user.roles, employee.designation);

    // Short-lived access token; the EMPLOYEE marker blocks use on patient routes
    const accessToken = signAccessToken({
        employeeCode: user.employeeCode,
        roles: user.roles,
        designation: employee.designation,
        tokenVersion: user.tokenVersion,
        type: "EMPLOYEE"
    });

    const refreshToken = await issueRefreshToken({
        subjectType: "EMPLOYEE",
        subjectId: user.employeeCode,
        req
    });

    // Staff web client: refresh token rides in an httpOnly cookie, never the body
    setRefreshCookie(res, refreshToken);

    await recordAudit({
        actorType: "EMPLOYEE",
        actorId: user.employeeCode,
        action: "USER_LOGIN",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.USER_LOGIN(user.employeeCode)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, {
        accessToken,
        user: {
            employeeCode: user.employeeCode,
            username: user.username,
            email: user.email,
            roles: user.roles,
            mustChangePassword: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
            permissions,
            profile
        }
    });
};

// change password by authenticated user
exports.changePassword = async (req, res) => {

    const employeeCode = req.user.employeeCode;

    const {
        currentPassword,
        newPassword,
        confirmPassword
    } = req.body;

    const user = await User.findOne({
        employeeCode
    });

    if (!user) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
    }

    const isMatch = Boolean(await bcrypt.compare(currentPassword, user.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const samePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
    if (samePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    // Hash and persist the new password, clearing the forced-change flag
    const newPassHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = newPassHash;
    user.mustChangePassword = false;

    // Invalidate every existing session, forcing a fresh login
    user.tokenVersion += 1;

    await user.save();

    await revokeAllForSubject("EMPLOYEE", user.employeeCode);

    // Invalidate the current session and drop it's refresh cookie
    clearRefreshCookie(res);

    await recordAudit({
        actorType: "EMPLOYEE",
        actorId: user.employeeCode,
        action: "PASSWORD_CHANGED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_CHANGED(user.employeeCode)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_CHANGED);
};

// Generate a short-lived reset token and email it to the user
exports.forgotPassword = async (req, res) => {

    const { email } = req.body;

    const user = await User.findOne({
        email
    });

    // Logged internally regardless of whether the email matched
    await recordAudit({
        actorType: user ? "EMPLOYEE" : "ANONYMOUS",
        actorId: user ? user.employeeCode : email,
        action: "PASSWORD_RESET_REQUESTED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_RESET_REQUESTED(email)
    });

    // Same neutral response always, so registered emails are not leaked
    const neutralResponse = () =>
        sendSuccess(res, STATUS.OK, MESSAGES.AUTH.RESET_LINK_SENT);

    if (
        !user ||
        String(user.status) !== "ACTIVE"
    ) {
        return neutralResponse();
    }

    // Create a random token, store only its hash so the raw value cannot be recovered from the DB
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const resetPasswordTokenHash =
        crypto
            .createHash("sha256")
            .update(resetPasswordToken)
            .digest("hex");

    user.resetPasswordTokenHash = resetPasswordTokenHash;
    user.resetPasswordTokenExpiry = resetPasswordTokenExpiry;

    await user.save();

    // dev only: print reset link to console for manual testing without email
    if (process.env.NODE_ENV !== "production") {
        console.log(
            "\n[DEV] Reset link for " + user.email + ":\n" +
            emailTemplates.frontendUrl() +
            "/reset-password?token=" + resetPasswordToken + "\n"
        );
    }

    // Send the raw token in the email attached to the url
    try {
        await sendEmail({
            to: user.email,
            ...emailTemplates.passwordReset({ resetToken: resetPasswordToken })
        });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }

    return neutralResponse();
};

// Validate the reset token and set a new password
exports.resetPassword = async (req, res) => {

    const {
        resetToken,
        newPassword,
        confirmPassword
    } = req.body;

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    // Hash the incoming token to look it up against the stored hash
    const hashedToken =
        crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

    const user = await User.findOne({
        resetPasswordTokenHash: hashedToken,
        resetPasswordTokenExpiry: {
            $gt: new Date()
        }
    });

    if (!user) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_TOKEN);
    }

    if (String(user.status) !== "ACTIVE") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const isSamePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
    if (isSamePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    // Hash the new password and clear the reset token fields
    const newHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = newHash;

    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpiry = null;
    user.mustChangePassword = false;

    // kill all live access and refresh tokens
    user.tokenVersion += 1;

    await user.save();

    await revokeAllForSubject("EMPLOYEE", user.employeeCode);

    await recordAudit({
        actorType: "EMPLOYEE",
        actorId: user.employeeCode,
        action: "PASSWORD_RESET_COMPLETED",
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PASSWORD_RESET_COMPLETED(user.employeeCode)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
};

// Revoke the cookie's refresh token so the session cannot be refreshed again
exports.logout = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    const tokenHash = refreshToken ? hashToken(refreshToken) : null;

    // Prefer access-token auth to handle stale tabs after logout; otherwise use the refresh-token owner
    let subjectId = req.user?.employeeCode || null;
    if (!subjectId && tokenHash) {
        const record = await findByHash(tokenHash);
        subjectId = record?.subjectId ?? null;
    }

    // Audit the logout event if we can identify the user; otherwise just revoke the token silently
    if (subjectId) {
        await recordAudit({
            actorType: "EMPLOYEE",
            actorId: subjectId,
            action: "USER_LOGOUT",
            ipAddress: req.ip,
            message: MESSAGES.AUDIT.USER_LOGOUT(subjectId)
        });
    }

    // Revoke separately; a no-op when the token is absent or already revoked
    if (tokenHash) {
        await revokeByHash(tokenHash);
    }

    clearRefreshCookie(res);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
};

// Exchange the cookie's refresh token for a new access token, rotating the cookie
exports.refresh = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const result = await rotateRefreshToken({
        rawToken: refreshToken,
        subjectType: "EMPLOYEE",
        req
    });

    if (result.status !== "OK") {
        if (result.status === "REUSE_DETECTED") {
            await recordAudit({
                actorType: "EMPLOYEE",
                actorId: result.subjectId,
                action: "REFRESH_REUSE_DETECTED",
                ipAddress: req.ip,
                message: MESSAGES.AUDIT.REFRESH_REUSE_DETECTED(result.subjectId)
            });
        }
        clearRefreshCookie(res);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const user = await User.findOne({ employeeCode: result.subjectId })
        .select("employeeCode roles status tokenVersion");

    // Subject vanished or was deactivated since the refresh token was issued
    if (!user || String(user.status) !== "ACTIVE") {
        await revokeAllForSubject("EMPLOYEE", result.subjectId);
        clearRefreshCookie(res);
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    setRefreshCookie(res, result.newRefreshToken);

    // Re-read the designation so a rotated token always carries the current claim
    const employee = await Employee.findOne({
        employeeCode: user.employeeCode
    }).select("designation");

    const accessToken = signAccessToken({
        employeeCode: user.employeeCode,
        roles: user.roles,
        designation: employee?.designation,
        tokenVersion: user.tokenVersion,
        type: "EMPLOYEE"
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.TOKEN_REFRESHED, {
        accessToken
    });
};

// Return the current user's account and profile
exports.me = async (req, res) => {
    const user = await getCurrentUser(req.user.employeeCode);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.USER_RETRIEVED, {
        user
    });
};

// Submit a self-registration request
exports.selfRegister = async (req, res) => {

    const { username, email, password, designation } = req.body;

    if (RESTRICTED_ROLES_SET.has(designation)) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.INVALID_DESIGNATION);
    }

    // Throws AppError(409) when username/email/registration number is taken
    await validateUniqueEmployeeFields(req.body);

    const passwordHash = await bcrypt.hash(password, 10);

    const employeeData = buildEmployeeData(req.body);

    const employee = new Employee(employeeData);
    await employee.save();

    const user = new User({
        username,
        email,
        passwordHash,
        roles: ["STAFF"],
        employeeCode: employee.employeeCode,
        status: "PENDING",
        mustChangePassword: false,
        createdByAdmin: false,
        approvedBy: null,
        approvedAt: null,
        createdBy: "Self registration"
    });

    await user.save();

    // Notify all active admins and owners of the pending registration
    try {
        const admins = await User.find({
            roles: { $in: ["ADMIN", "OWNER"] },
            status: "ACTIVE"
        });

        const adminEmails = admins.map((admin) => admin.email);

        if (adminEmails.length) {
            await sendEmail({
                to: adminEmails,
                ...emailTemplates.registrationRequest({
                    name: employee.name,
                    employeeCode: employee.employeeCode,
                    department: employee.department,
                    designation: employee.designation
                })
            });
        }
    } catch (emailError) {
        console.error("Admin notification email error:", emailError);
    }

    return sendSuccess(res, STATUS.CREATED, MESSAGES.AUTH.SELF_REGISTER_SUCCESS, {
        user: {
            username: user.username,
            email: user.email,
            roles: user.roles
        },

        employee: {
            employeeCode: employee.employeeCode,
            name: employee.name,
            department: employee.department,
            designation: employee.designation
        }
    });
};