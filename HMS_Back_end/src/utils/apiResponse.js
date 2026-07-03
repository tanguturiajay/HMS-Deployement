// Single point of truth for the success wire envelope; every 2xx goes through sendSuccess
const sendSuccess = (res, statusCode, message, data = {}) =>
    res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data
    });

module.exports = { sendSuccess };
