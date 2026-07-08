const User = require("../models/Users");
const Employee = require("../models/Employees");
const buildEmployeeProfile = require("./buildEmployeeProfile");
const getEffectivePermissions = require("./getEffectivePermissions");
const AppError = require("./AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Builds the current user payload; throws when account or employee profile is missing
async function getCurrentUser(employeeCode) {
    const user = await User.findOne({ employeeCode })
        .select("-passwordHash -resetPasswordTokenHash -resetPasswordTokenExpiry -__v");

    if (!user) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
    }

    const employee = await Employee.findOne({ employeeCode: user.employeeCode }).select("-__v");

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.EMPLOYEE_PROFILE_NOT_FOUND);
    }

    const profile = buildEmployeeProfile(employee);
    const permissions = await getEffectivePermissions(user.roles, employee.designation);

    return {
        employeeCode: user.employeeCode,
        username: user.username,
        email: user.email,
        roles: user.roles,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
        permissions,
        profile
    };
}

module.exports = getCurrentUser;