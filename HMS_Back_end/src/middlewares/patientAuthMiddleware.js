const jwt = require("jsonwebtoken");
const Patient = require("../models/Patients");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Authenticates patient access tokens
const authenticatePatient = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.NO_TOKEN);
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    // Handles invalid or expired tokens
    try {
        decoded = jwt.verify(token, process.env.JWT_PATIENT_SECRET, { algorithms: ["HS256"] });
    }
    catch {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    if (decoded.type !== "PATIENT" || !decoded.patientUHID) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Rejects deleted or inactive patients
    const patient = await Patient.findOne({ UHID: decoded.patientUHID })
        .select("status tokenVersion mustChangePassword");

    // Rejects tokens invalidated by password changes
    if (
        !patient ||
        patient.status !== "ACTIVE" ||
        patient.tokenVersion !== decoded.tokenVersion
    ) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Restricts patients with temporary passwords to auth routes only
    if (patient.mustChangePassword && req.baseUrl !== "/api/patient/auth") {
        throw new AppError(
            STATUS.FORBIDDEN,
            MESSAGES.AUTH.PASSWORD_CHANGE_REQUIRED,
            undefined,
            "PASSWORD_CHANGE_REQUIRED"
        );
    }

    req.patient = { patientUHID: decoded.patientUHID };

    next();
};

module.exports = authenticatePatient;
