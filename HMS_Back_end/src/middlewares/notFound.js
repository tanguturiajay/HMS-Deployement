const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Catch-all 404 forwarded to the global error handler for the JSON envelope
const notFound = (req, res, next) =>
    next(new AppError(STATUS.NOT_FOUND, MESSAGES.COMMON.ROUTE_NOT_FOUND));

module.exports = notFound;
