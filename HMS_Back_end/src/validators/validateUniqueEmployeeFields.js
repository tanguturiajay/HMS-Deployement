const User = require("../models/Users");
const Employee = require("../models/Employees");
const { MEDICAL_DESIGNATIONS_SET } = require("../constants/domain");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Throws AppError 409 on any uniqueness violation, resolves silently otherwise
const validateUniqueEmployeeFields = async (data) => {

    const {
        username,
        email,
        designation,
        medicalRegistrationNumber
    } = data;

    // Check username uniqueness across all user accounts
    const existingUsername = await User.findOne({
        username
    });

    if (existingUsername) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.USERNAME_EXISTS);
    }

    // Check email uniqueness in the users collection
    const existingUserEmail = await User.findOne({
        email
    });

    if (existingUserEmail) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.USER_EMAIL_EXISTS);
    }

    // Check email uniqueness in the employees collection
    const existingEmployeeEmail = await Employee.findOne({
        email
    });

    if (existingEmployeeEmail) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.EMAIL_EXISTS);
    }

    // Medical registration number uniqueness is only enforced for medical designations
    if (MEDICAL_DESIGNATIONS_SET.has(designation)) {
        const existingMedicalEmployee = await Employee.findOne({
            medicalRegistrationNumber
        });

        if (existingMedicalEmployee) {
            throw new AppError(STATUS.CONFLICT, MESSAGES.EMPLOYEE.MED_REG_EXISTS);
        }
    }
};

module.exports = validateUniqueEmployeeFields;
