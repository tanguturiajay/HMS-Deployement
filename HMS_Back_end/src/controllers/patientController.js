const bcrypt = require("bcryptjs");
const Patient = require("../models/Patients");
const sendEmail = require("../utils/sendEmail");
const generateTemporaryPassword = require("../utils/generateTemporaryPassword");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const hasFieldChanges = require("../utils/hasFieldChanges");
const emailTemplates = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
const parsePagination = require("../utils/parsePagination");

// Fields a patient record exposes
const PATIENT_PROJECTION = "-passwordHash -__v";

// Create Patient Account
exports.createPatient = async (req, res) => {

    const {
        name,
        phone,
        email,
        gender,
        dob,
        address,
        emergencyContact,
        status
    } = req.body;

    const existingPatient = await Patient.findOne({
        email
    });

    if (existingPatient) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.ALREADY_REGISTERED);
    }

    const temporaryPassword = generateTemporaryPassword();

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const patientData = {
        name,
        phone,
        email,
        passwordHash,
        gender,
        dob,
        address,
        emergencyContact,
        status,
        createdByEmployeeId: req.user.employeeCode
    };

    // Create Patient
    const patient = new Patient(patientData);
    await patient.save();

    // Send email AFTER successful account creation
    try {
        await sendEmail({
            to: patient.email,
            ...emailTemplates.patientCredentials({ email, temporaryPassword }),
        });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }

    // Record audit
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "PATIENT_CREATED",
        targetType: "PATIENT",
        targetId: patient.UHID,
        message: MESSAGES.AUDIT.PATIENT_REGISTERED(patient.name, patient.UHID)
    });

    const safePatient = patient.toObject();
    delete safePatient.passwordHash;
    delete safePatient.__v;

    return sendSuccess(res, STATUS.CREATED, MESSAGES.PATIENT.CREATED, {
        patient: safePatient
    });
};

// Get all patients
exports.getPatients = async (req, res) => {

    const { page, limit, skip } = parsePagination(req.query, 10);

    // Build filter
    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.gender) {
        filter.gender = req.query.gender;
    }

    const [patients, total] = await Promise.all([
        Patient.find(filter)
            .select(PATIENT_PROJECTION)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit),
        Patient.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        patients
    });
};

// Search patients by name / phone / email / UHID
exports.searchPatients = async (req, res) => {

    const query = (req.query.q || "").trim();

    if (!query) {
        return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.NO_SEARCH_QUERY, {
            total: 0,
            patients: []
        });
    }

    // Escape regex special characters for safe matching
    const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const regex = new RegExp(escaped, "i");

    const patients = await Patient.find({
        $or: [
            { name: regex },
            { phone: regex },
            { email: regex },
            { UHID: regex }
        ]
    })
        .select(PATIENT_PROJECTION)
        .sort({ _id: -1 })
        .limit(50);

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.SEARCH_COMPLETED, {
        total: patients.length,
        patients
    });
};

// Get a single patient by UHID
exports.getPatientById = async (req, res) => {

    const { UHID } = req.params;

    const patient = await Patient.findOne({ UHID }).select(
        PATIENT_PROJECTION
    );

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.RETRIEVED, {
        patient
    });
};

// Update a patient
exports.updatePatient = async (req, res) => {

    const { UHID } = req.params;

    const patient = await Patient.findOne({ UHID });

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    // Fields that may be updated
    const allowedFields = [
        "name",
        "phone",
        "gender",
        "dob",
        "address",
        "emergencyContact",
        "status"
    ];

    // Rejects updates with no actual changes
    if (!hasFieldChanges(patient, req.body, [...allowedFields, "email"], { dateFields: ["dob"] })) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
    }

    // Ensures email uniqueness before updating
    if (req.body.email && req.body.email !== patient.email) {
        const existing = await Patient.findOne({
            email: req.body.email
        });

        if (existing) {
            throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.EMAIL_EXISTS);
        }

        patient.email = req.body.email;
    }

    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            patient[field] = req.body[field];
        }
    });

    await patient.save();

    // Record audit
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "PATIENT_UPDATED",
        targetType: "PATIENT",
        targetId: patient.UHID,
        message: MESSAGES.AUDIT.PATIENT_UPDATED(patient.name, patient.UHID)
    });

    const safePatient = patient.toObject();
    delete safePatient.passwordHash;
    delete safePatient.__v;

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.UPDATED, {
        patient: safePatient
    });
};

// Soft deletes a patient
exports.deletePatient = async (req, res) => {

    const { UHID } = req.params;

    const patient = await Patient.findOne({ UHID });

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    const actor = await resolveActor(req.user);

    patient.isDeleted = true;
    patient.deletedAt = new Date();
    patient.deletedBy = actor.employeeCode;
    await patient.save();

    await recordAudit({
        actor,
        action: "PATIENT_DELETED",
        targetType: "PATIENT",
        targetId: patient.UHID,
        message: MESSAGES.AUDIT.PATIENT_DELETED(patient.name, patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.DELETED, {
        patient: { UHID: patient.UHID }
    });
};
