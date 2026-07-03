const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const User = require("../models/Users");
const Appointment = require("../models/Appointments");
const MedicalRecord = require("../models/MedicalRecords");
const emailTemplates = require("../utils/emailTemplates");
const checkAppointmentValidity = require("../validators/checkAppointmentValidity");
const paginateAppointments = require("../utils/paginateAppointments");
const parsePagination = require("../utils/parsePagination");
const getBookedSlots = require("../utils/getBookedSlots");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const cancelAppointmentRecord = require("../utils/cancelAppointmentRecord");
const hasFieldChanges = require("../utils/hasFieldChanges");
const recordAudit = require("../utils/recordAudit");
const { toSafePatient, PATIENT_SAFE_PROJECTION } = require("../utils/toSafePatient");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Creates an audit actor for patients
const patientActor = (patient) => ({
    employeeCode: patient.UHID,
    name: patient.name,
    designation: "PATIENT"
});

/// Retrieves the authenticated patient's profile
exports.getMyProfile = async (req, res) => {

    const patient = await Patient.findOne({
        UHID: req.patient.patientUHID
    }).select(PATIENT_SAFE_PROJECTION);

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.PROFILE_RETRIEVED, {
        patient
    });
};

// Updates the authenticated patient's profile
exports.updateMyProfile = async (req, res) => {

    const patient = await Patient.findOne({
        UHID: req.patient.patientUHID
    });

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    // Rejects updates with no actual changes
    if (!hasFieldChanges(patient, req.body, ["phone", "email", "address", "emergencyContact"])) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
    }

    // Ensures email uniqueness before updating
    if (req.body.email && req.body.email !== patient.email) {
        const existing = await Patient.findOne({ email: req.body.email });
        if (existing) {
            throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.EMAIL_EXISTS);
        }
        patient.email = req.body.email;
    }

    const editableFields = ["phone", "address", "emergencyContact"];
    editableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            patient[field] = req.body[field];
        }
    });

    await patient.save();

    await recordAudit({
        actor: patientActor(patient),
        action: "PATIENT_UPDATED",
        targetType: "PATIENT",
        targetId: patient.UHID,
        message: MESSAGES.AUDIT.PATIENT_PROFILE_UPDATED(patient.name, patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.PROFILE_UPDATED, {
        patient: toSafePatient(patient)
    });
};

// Lists active doctors for appointment booking
exports.getDoctors = async (req, res) => {

    const users = await User.find({ status: "ACTIVE" }).select("employeeCode");
    const activeCodes = users.map((u) => u.employeeCode);

    const doctors = await Employee.find({
        designation: "DOCTOR",
        employeeCode: { $in: activeCodes }
    }).select(
        "employeeCode name specialization department consultationFee availabilitySlots qualification joiningDate bookingCutoffDate"
    );

    return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.DOCTORS_RETRIEVED, {
        total: doctors.length,
        doctors
    });
};

// Returns booked slots for a doctor
exports.getBookedSlots = getBookedSlots;

// Lists the authenticated patient's appointments
exports.getMyAppointments = async (req, res) => {

    const filter = { patientUHID: req.patient.patientUHID };
    if (req.query.status) {
        filter.status = req.query.status;
    }

    return paginateAppointments(filter, req.query, res);
};

// Book an appointment for the authenticated patient
exports.bookAppointment = async (req, res) => {

    const patientUHID = req.patient.patientUHID;
    const { doctorEmployeeId, appointmentDate, timeSlot } = req.body;

    // Validates appointment booking rules
    const { patient, doctor } = await checkAppointmentValidity({
        patientUHID,
        doctorId: doctorEmployeeId,
        appointmentDate,
        timeSlot
    });

    const appointment = await Appointment.create({
        patientUHID,
        doctorEmployeeId,
        appointmentDate,
        timeSlot
    });

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentScheduled({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    await recordAudit({
        actor: patientActor(patient),
        action: "APPOINTMENT_CREATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_BOOKED_BY_PATIENT(
            appointment.appointmentId,
            patient.name,
            doctor.name
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.APPOINTMENT.CREATED, {
        appointment
    });
};

// Reschedule one of the patient's own BOOKED appointments
exports.updateMyAppointment = async (req, res) => {

    const patientUHID = req.patient.patientUHID;
    const { appointmentId } = req.params;
    const { doctorEmployeeId, appointmentDate, timeSlot } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    // Restricts patients to their own appointments
    if (appointment.patientUHID !== patientUHID) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
    }

    if (appointment.status !== "BOOKED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ONLY_BOOKED_EDITABLE);
    }

    // Validates appointment booking rules
    const { patient, doctor } = await checkAppointmentValidity({
        patientUHID,
        doctorId: doctorEmployeeId,
        appointmentDate,
        timeSlot,
        excludeAppointmentId: appointmentId
    });

    appointment.doctorEmployeeId = doctorEmployeeId;
    appointment.appointmentDate = appointmentDate;
    appointment.timeSlot = timeSlot;
    await appointment.save();

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentUpdated({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    await recordAudit({
        actor: patientActor(patient),
        action: "APPOINTMENT_UPDATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_RESCHEDULED_BY_PATIENT(
            appointment.appointmentId,
            patient.name
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.UPDATED, {
        appointment
    });
};

// Cancel one of the patient's own appointments
exports.cancelMyAppointment = async (req, res) => {

    const patientUHID = req.patient.patientUHID;
    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.patientUHID !== patientUHID) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_CANCEL);
    }

    await cancelAppointmentRecord(appointment, cancellationReason);

    await recordAudit({
        actor: { employeeCode: appointment.patientUHID, designation: "PATIENT" },
        action: "APPOINTMENT_CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_CANCELLED_BY_PATIENT(
            appointment.appointmentId,
            cancellationReason
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.CANCELLED, {
        appointment
    });
};

// // Lists the authenticated patient's finalized medical records
exports.getMyMedicalRecords = async (req, res) => {

    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
        patientUHID: req.patient.patientUHID,
        status: "FINALIZED",
        isDeleted: { $ne: true }
    };

    const [medicalRecords, total] = await Promise.all([
        MedicalRecord.find(filter)
            .select("medicalRecordId appointmentId doctorName status created_at")
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MedicalRecord.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        medicalRecords
    });
};

// Retrieves a finalized medical record by ID
exports.getMyMedicalRecordById = async (req, res) => {

    const { medicalRecordId } = req.params;

    const record = await MedicalRecord.findOne({
        medicalRecordId,
        patientUHID: req.patient.patientUHID,
        status: "FINALIZED",
        isDeleted: { $ne: true }
    })
        .select("-__v -notes")
        .lean();

    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
        medicalRecord: record
    });
};

// Returns the medical record state for an appointment
exports.getMyMedicalRecordByAppointment = async (req, res) => {

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({ appointmentId }).select("patientUHID");

    if (!appointment || appointment.patientUHID !== req.patient.patientUHID) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    const record = await MedicalRecord.findOne({
        appointmentId,
        isDeleted: { $ne: true }
    })
        .select("-__v -notes")
        .lean();

    if (!record) {
        return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
            state: "NONE",
            medicalRecord: null
        });
    }

    if (record.status !== "FINALIZED") {
        return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
            state: "DRAFT",
            medicalRecord: null
        });
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
        state: "FINALIZED",
        medicalRecord: record
    });
};
