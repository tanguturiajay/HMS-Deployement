const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Builds a standardized error response
const sendError = (res, statusCode, message, errors, code) => {
    const body = {
        success: false,
        statusCode,
        message
    };
    if (errors?.length) {
        body.errors = errors;
    }
    if (code) {
        body.code = code;
    }
    return res.status(statusCode).json(body);
};

// Handles all application errors
const errorHandler = (err, req, res, next) => {

    if (res.headersSent) {
        return next(err);
    }

    // Handles application errors
    if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.message, err.errors, err.code);
    }

    // Handles malformed JSON requests
    if (err.type === "entity.parse.failed") {
        return sendError(res, STATUS.BAD_REQUEST, MESSAGES.COMMON.INVALID_JSON);
    }

    // Handles Mongoose validation errors
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors || {}).map((e) => ({
            msg: e.message,
            path: e.path
        }));
        return sendError(res, STATUS.UNPROCESSABLE_ENTITY, MESSAGES.COMMON.VALIDATION_FAILED, errors);
    }

    // Handles invalid ObjectId errors
    if (err.name === "CastError") {
        return sendError(res, STATUS.BAD_REQUEST, MESSAGES.COMMON.VALIDATION_FAILED);
    }

    // Handles duplicate key errors
    if (err.code === 11000) {
        return sendError(res, STATUS.CONFLICT, MESSAGES.COMMON.DUPLICATE_KEY);
    }

    // Handles unexpected errors
    console.error("Unhandled error:", err);
    return sendError(res, STATUS.INTERNAL_SERVER_ERROR, MESSAGES.COMMON.INTERNAL_ERROR);
};

module.exports = errorHandler;
module.exports.sendError = sendError;
