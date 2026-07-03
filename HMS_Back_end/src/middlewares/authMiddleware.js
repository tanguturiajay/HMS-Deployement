const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.NO_TOKEN);
    }

    const token = authHeader.split(" ")[1];

    // Handles invalid or expired tokens
    try {
        req.user = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );
    }
    catch {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Rejects non-employee or malformed tokens
    if (req.user.type !== "EMPLOYEE" || !req.user.employeeCode) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Rejects deleted or inactive users
    const user = await User.findOne({ employeeCode: req.user.employeeCode })
        .select("status tokenVersion mustChangePassword");

    // Rejects tokens invalidated by password changes
    if (
        !user ||
        String(user.status) !== "ACTIVE" ||
        user.tokenVersion !== req.user.tokenVersion
    ) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Restricts users with temporary passwords to auth routes only
    if (user.mustChangePassword && req.baseUrl !== "/api/auth") {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.PASSWORD_CHANGE_REQUIRED);
    }

    next();
};

module.exports = authenticateUser;
