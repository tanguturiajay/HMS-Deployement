const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authorizeRoles = (...allowedRoles) => {

    return (req, res, next) => {

        // Ensure user exists
        if (!req.user) {
            throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
        }

        // Check if user has at least one allowed role
        const hasPermission =
            req.user.roles.some((role) =>
                allowedRoles.includes(role)
            );

        if (!hasPermission) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
        }

        next();
    };
};

module.exports = authorizeRoles;
