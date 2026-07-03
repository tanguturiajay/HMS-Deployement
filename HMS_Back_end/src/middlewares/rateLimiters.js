const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Creates a rate limiter with standardized error responses
const buildLimiter = ({ windowMs, limit, message }) => {
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
        throw new Error(
            "Rate limiter configuration error: windowMs must be a positive integer"
        );
    }

    if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error(
            "Rate limiter configuration error: limit must be a positive integer"
        );
    }

    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) =>
            next(new AppError(STATUS.TOO_MANY_REQUESTS, message))
    });
};

// Limits login attempts
const loginLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: MESSAGES.AUTH.TOO_MANY_ATTEMPTS
});

// Limits password reset requests
const passwordResetLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: MESSAGES.AUTH.TOO_MANY_REQUESTS
});

module.exports = { loginLimiter, passwordResetLimiter };