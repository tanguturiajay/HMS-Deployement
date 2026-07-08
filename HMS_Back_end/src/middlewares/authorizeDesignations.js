const AppError = require("../utils/AppError");
const resolveDesignation = require("../utils/resolveDesignation");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authorizeDesignation = (...allowedDesignations) => {

    return async (req, res, next) => {

        // Ensure user exists
        if (!req.user) {
            throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
        }

        const designation = await resolveDesignation(req);

        if (!designation) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.UNAUTHORIZED);
        }

        // Check if employee has at least one allowed designation
        const hasPermission = allowedDesignations.includes(designation);

        if (!hasPermission) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
        }

        next();
    };
};

module.exports = authorizeDesignation;