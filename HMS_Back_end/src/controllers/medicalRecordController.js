const MedicalRecord = require("../models/MedicalRecords");
const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const emailTemplates = require("../utils/emailTemplates");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const slotInstantMs = require("../utils/slotInstantMs");
const buildMedicalRecordFilter = require("../utils/buildMedicalRecordFilter");
const paginateMedicalRecords = require("../utils/paginateMedicalRecords");
const hasFieldChanges = require("../utils/hasFieldChanges");
const { hasPermission } = require("../middlewares/requirePermission");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Checks whether the actor is a doctor
const isDoctorActor = (actor) => actor.designation === "DOCTOR";

// Handles post-create actions based on record status and creator role
const applyCreateSideEffects = async ({ record, recordStatus, doctorRole, actor, appointment, patient, doctor }) => {
    if (recordStatus === "FINALIZED") {
        // Finalizing completes the appointment
        appointment.status = "COMPLETED";
        await appointment.save();

        await sendAppointmentEmail(
            patient.email,
            emailTemplates.diagnosisReportAvailable({ patientName: patient.name })
        );

        await recordAudit({
            actor,
            action: "MEDICAL_RECORD_FINALIZED",
            targetType: "MEDICAL_RECORD",
            targetId: record.medicalRecordId,
            message: MESSAGES.AUDIT.MEDICAL_RECORD_DOCTOR_CREATED_FINALIZED(doctor.name)
        });
        return;
    }

    if (doctorRole) {
        await recordAudit({
            actor,
            action: "MEDICAL_RECORD_CREATED",
            targetType: "MEDICAL_RECORD",
            targetId: record.medicalRecordId,
            message: MESSAGES.AUDIT.MEDICAL_RECORD_DOCTOR_CREATED_DRAFT(doctor.name)
        });
        return;
    }

    // Staff draft — assigned doctor must verify
    if (doctor.email) {
        await sendAppointmentEmail(
            doctor.email,
            emailTemplates.medicalRecordVerificationRequired({
                doctorName: doctor.name,
                patientName: patient.name,
                patientUHID: patient.UHID,
                appointmentId: appointment.appointmentId,
                creatorRole: actor.designation,
                creatorName: actor.name
            })
        );
    }

    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_CREATED",
        targetType: "MEDICAL_RECORD",
        targetId: record.medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_STAFF_CREATED_DRAFT(
            actor.designation,
            actor.name,
            doctor.employeeCode,
            doctor.name
        )
    });
};

// Keeps empty arrays undefined instead of persisting []
const normalizeArray = (value) =>
    Array.isArray(value) && value.length > 0 ? value : undefined;

// Applies editable fields and clears empty optional arrays
const applyEditableFields = (record, { chiefComplaint, symptoms, diagnosis, advice, prescriptionItems, medicalObservations, notes }) => {
    if (chiefComplaint !== undefined) {
        record.chiefComplaint = chiefComplaint;
    }
    if (symptoms !== undefined) {
        record.symptoms = symptoms;
    }
    if (diagnosis !== undefined) {
        record.diagnosis = diagnosis;
    }
    if (advice !== undefined) {
        record.advice = advice;
    }
    if (prescriptionItems !== undefined) {
        record.prescriptionItems = normalizeArray(prescriptionItems);
    }
    if (medicalObservations !== undefined) {
        record.medicalObservations = normalizeArray(medicalObservations);
    }
    if (notes !== undefined) {
        record.notes = notes;
    }
};

const isBlank = (value) => typeof value !== "string" || value.trim() === "";

// 403 with the friend-style missing permission message and machine readable code
const missingPermissionError = (code) =>
    new AppError(
        STATUS.FORBIDDEN,
        MESSAGES.AUTH.MISSING_PERMISSION([code]),
        undefined,
        "FORBIDDEN"
    );

// Validates required fields and nested record completeness
const assertRecordComplete = (record) => {
    if (
        isBlank(record.chiefComplaint) ||
        isBlank(record.symptoms) ||
        isBlank(record.diagnosis) ||
        isBlank(record.advice)
    ) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.FIELDS_REQUIRED);
    }

    const items = record.prescriptionItems || [];
    const hasIncompleteItem = items.some(
        (item) =>
            isBlank(item.name) ||
            isBlank(item.dosage) ||
            isBlank(item.frequency) ||
            isBlank(item.duration) ||
            isBlank(item.administrationCategory) ||
            isBlank(item.administrationMethod)
    );
    if (hasIncompleteItem) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.PRESCRIPTION_REQUIRED);
    }

    const observations = record.medicalObservations || [];
    const hasIncompleteObservation = observations.some(
        (obs) => isBlank(obs.metricName) || isBlank(obs.metricValue) || !obs.recordedTime
    );
    if (hasIncompleteObservation) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.OBSERVATION_INCOMPLETE);
    }
};

// Finalizes a record and completes the appointment
const applyFinalizeUpdate = async ({ record, actor }) => {
    record.status = "FINALIZED";
    await record.save();

    const appointment = await Appointment.findOne({ appointmentId: record.appointmentId });
    if (appointment) {
        appointment.status = "COMPLETED";
        await appointment.save();
    }

    const patient = await Patient.findOne({ UHID: record.patientUHID }).select("name email");
    if (patient?.email) {
        await sendAppointmentEmail(
            patient.email,
            emailTemplates.diagnosisReportAvailable({ patientName: patient.name })
        );
    }

    const createdByStaff = record.createdByDesignation && record.createdByDesignation !== "DOCTOR";
    const message = createdByStaff
        ? MESSAGES.AUDIT.MEDICAL_RECORD_VERIFIED_FINALIZED(
            record.createdByDesignation,
            record.createdByName,
            record.doctorName
        )
        : MESSAGES.AUDIT.MEDICAL_RECORD_DOCTOR_UPDATED_FINALIZED(record.doctorName);

    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_FINALIZED",
        targetType: "MEDICAL_RECORD",
        targetId: record.medicalRecordId,
        message
    });
};

// Saves draft changes and triggers re-verification if needed
const applyDraftUpdate = async ({ record, actor, doctorRole }) => {
    await record.save();

    if (doctorRole) {
        await recordAudit({
            actor,
            action: "MEDICAL_RECORD_UPDATED",
            targetType: "MEDICAL_RECORD",
            targetId: record.medicalRecordId,
            message: MESSAGES.AUDIT.MEDICAL_RECORD_DOCTOR_UPDATED_DRAFT(record.doctorName)
        });
        return;
    }

    // Staff update — assigned doctor must verify again
    const doctor = await Employee.findOne({
        employeeCode: record.doctorEmployeeId
    }).select("email");

    if (doctor?.email) {
        await sendAppointmentEmail(
            doctor.email,
            emailTemplates.medicalRecordVerificationUpdated({
                doctorName: record.doctorName,
                patientName: record.patientName,
                patientUHID: record.patientUHID,
                appointmentId: record.appointmentId,
                creatorRole: actor.designation,
                creatorName: actor.name
            })
        );
    }

    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_UPDATED",
        targetType: "MEDICAL_RECORD",
        targetId: record.medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_STAFF_UPDATED_DRAFT(
            actor.designation,
            actor.name,
            record.doctorEmployeeId,
            record.doctorName
        )
    });
};

// Creates a medical record for an appointment
exports.createMedicalRecord = async (req, res) => {

    const {
        appointmentId,
        chiefComplaint,
        symptoms,
        diagnosis,
        advice,
        prescriptionItems,
        medicalObservations,
        notes,
        status
    } = req.body;

    const actor = await resolveActor(req.user);
    const doctorRole = isDoctorActor(actor);

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    // Rejects records for cancelled or unattended appointments
    if (appointment.status === "CANCELED" || appointment.status === "UNATTENDED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.APPOINTMENT_NOT_ELIGIBLE);
    }

    // Restricts doctors to their own appointments
    if (doctorRole && appointment.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.MEDICAL_RECORD.OWN_ONLY);
    }

    // Ensures only one active record per appointment
    const existing = await MedicalRecord.findOne({
        appointmentId,
        isDeleted: { $ne: true }
    });

    if (existing) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.MEDICAL_RECORD.ALREADY_EXISTS);
    }

    // Prevents record creation before appointment start
    const slotStart = (appointment.timeSlot || "").split("-")[0];
    const startMs = slotInstantMs(appointment.appointmentDate, slotStart);
    if (!Number.isNaN(startMs) && startMs > Date.now()) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.CANNOT_BEFORE_START);
    }

    // Resolves patient and doctor details
    const [patient, doctor] = await Promise.all([
        Patient.findOne({ UHID: appointment.patientUHID }).select("UHID name email"),
        Employee.findOne({ employeeCode: appointment.doctorEmployeeId }).select("employeeCode name email")
    ]);

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }
    if (!doctor) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    // The requested status decides which create permission applies
    let recordStatus = "DRAFT";
    if (status === "FINALIZED") {
        if (!(await hasPermission(req, "CREATE_AND_FINALIZE_MEDICAL_RECORD"))) {
            throw missingPermissionError("CREATE_AND_FINALIZE_MEDICAL_RECORD");
        }

        // Only the assigned doctor may finalize
        if (appointment.doctorEmployeeId !== req.user.employeeCode) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.MEDICAL_RECORD.STAFF_CANNOT_FINALIZE);
        }

        recordStatus = "FINALIZED";
    } else if (!(await hasPermission(req, "CREATE_MEDICAL_RECORD_DRAFT"))) {
        throw missingPermissionError("CREATE_MEDICAL_RECORD_DRAFT");
    }

    const record = new MedicalRecord({
        appointmentId,
        patientUHID: patient.UHID,
        patientName: patient.name,
        doctorEmployeeId: doctor.employeeCode,
        doctorName: doctor.name,
        chiefComplaint,
        symptoms,
        diagnosis,
        advice,
        prescriptionItems: normalizeArray(prescriptionItems),
        medicalObservations: normalizeArray(medicalObservations),
        notes,
        status: recordStatus,
        createdByEmployeeId: actor.employeeCode,
        createdByName: actor.name,
        createdByDesignation: actor.designation
    });

    await record.save();

    await applyCreateSideEffects({
        record,
        recordStatus,
        doctorRole,
        actor,
        appointment,
        patient,
        doctor
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.MEDICAL_RECORD.CREATED, {
        medicalRecord: record
    });
};

// Updates a draft medical record
exports.updateMedicalRecord = async (req, res) => {

    const { medicalRecordId } = req.params;
    const {
        chiefComplaint,
        symptoms,
        diagnosis,
        advice,
        prescriptionItems,
        medicalObservations,
        notes,
        status
    } = req.body;

    const actor = await resolveActor(req.user);
    const doctorRole = isDoctorActor(actor);

    const record = await MedicalRecord.findOne({
        medicalRecordId,
        isDeleted: { $ne: true }
    });

    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    // Restricts doctors to their own records
    if (doctorRole && record.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.MEDICAL_RECORD.OWN_ONLY);
    }

    // Prevents edits to finalized records
    if (record.status === "FINALIZED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.ONLY_DRAFT_EDITABLE);
    }

    // Finalizing a draft is the verify step and needs its own permission
    let willFinalize = false;
    if (status === "FINALIZED") {
        if (!(await hasPermission(req, "VERIFY_AND_FINALIZE_MEDICAL_RECORD"))) {
            throw missingPermissionError("VERIFY_AND_FINALIZE_MEDICAL_RECORD");
        }

        // Only the assigned doctor may finalize
        if (record.doctorEmployeeId !== req.user.employeeCode) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.MEDICAL_RECORD.STAFF_CANNOT_FINALIZE);
        }

        willFinalize = true;
    } else if (!(await hasPermission(req, "CREATE_MEDICAL_RECORD_DRAFT"))) {
        throw missingPermissionError("CREATE_MEDICAL_RECORD_DRAFT");
    }

    // Rejects updates with no actual changes
    if (
        !willFinalize &&
        !hasFieldChanges(
            record,
            { chiefComplaint, symptoms, diagnosis, advice, notes, prescriptionItems, medicalObservations },
            ["chiefComplaint", "symptoms", "diagnosis", "advice", "notes", "prescriptionItems", "medicalObservations"],
            {
                arrayKeys: {
                    prescriptionItems: [
                        "name",
                        "dosage",
                        "frequency",
                        "duration",
                        "foodTiming",
                        "administrationCategory",
                        "administrationMethod"
                    ],
                    medicalObservations: ["metricName", "metricValue", "recordedTime"]
                }
            }
        )
    ) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
    }

    applyEditableFields(record, { chiefComplaint, symptoms, diagnosis, advice, prescriptionItems, medicalObservations, notes });

    // Ensures the updated record remains complete
    assertRecordComplete(record);

    if (willFinalize) {
        await applyFinalizeUpdate({ record, actor });
    } else {
        await applyDraftUpdate({ record, actor, doctorRole });
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.UPDATED, {
        medicalRecord: record
    });
};

// Lists paginated medical records scoped by the caller's view permission
exports.listMedicalRecords = async (req, res) => {

    // Without the all-scope the caller only sees records where they are the doctor
    const canViewAll = await hasPermission(req, "VIEW_ALL_MEDICAL_RECORDS");
    const scopedDoctorId = canViewAll ? null : req.user.employeeCode;

    const filter = buildMedicalRecordFilter(req.query, scopedDoctorId);

    return paginateMedicalRecords(filter, req.query, res);
};

// Retrieves a medical record by ID
exports.getMedicalRecordById = async (req, res) => {

    const { medicalRecordId } = req.params;

    const filter = { medicalRecordId, isDeleted: { $ne: true } };
    if (!(await hasPermission(req, "VIEW_ALL_MEDICAL_RECORDS"))) {
        filter.doctorEmployeeId = req.user.employeeCode;
    }

    const record = await MedicalRecord.findOne(filter).select("-__v").lean();

    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
        medicalRecord: record
    });
};

// Returns a record for an appointment, if available
exports.getMedicalRecordByAppointment = async (req, res) => {

    const { appointmentId } = req.params;

    const filter = { appointmentId, isDeleted: { $ne: true } };
    if (!(await hasPermission(req, "VIEW_ALL_MEDICAL_RECORDS"))) {
        filter.doctorEmployeeId = req.user.employeeCode;
    }

    const record = await MedicalRecord.findOne(filter).select("-__v").lean();

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
        medicalRecord: record || null
    });
};

// Soft deletes a medical record
exports.deleteMedicalRecord = async (req, res) => {

    const { medicalRecordId } = req.params;

    const actor = await resolveActor(req.user);

    const record = await MedicalRecord.findOne({
        medicalRecordId,
        isDeleted: { $ne: true }
    });

    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = actor.employeeCode;
    await record.save();

    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_DELETED",
        targetType: "MEDICAL_RECORD",
        targetId: record.medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_DELETED(
            record.medicalRecordId,
            actor.designation,
            actor.name
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.DELETED, {
        medicalRecord: record
    });
};