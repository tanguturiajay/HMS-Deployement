// Operational error translated into an HTTP response by the global error handler
class AppError extends Error {

    // Carries an HTTP status and catalog message plus optional field errors and a machine readable client code
    constructor(statusCode, message, errors = undefined, code = undefined) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.errors = errors;
        this.code = code;
        // Marks errors we threw on purpose, as opposed to programmer bugs
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
