const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const checkAppointmentValidity = require("../validators/checkAppointmentValidity");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const emailTemplates = require("../utils/emailTemplates");
const enrichAppointments = require("../utils/enrichAppointments");
const paginateAppointments = require("../utils/paginateAppointments");
const { paginateDoctorTab } = require("../utils/doctorAppointmentTabs");
const getBookedSlots = require("../utils/getBookedSlots");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const cancelAppointmentRecord = require("../utils/cancelAppointmentRecord");
const hasFieldChanges = require("../utils/hasFieldChanges");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Escapes user input for safe use inside a RegExp (partial-match search)
const escapeRegex = (value) => String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Case-insensitive partial match for a search term
const partial = (value) => ({ $regex: escapeRegex(value), $options: "i" });

// Create appointment
exports.createAppointment = async (req, res) => {

    const {
        patientUHID,
        doctorEmployeeId,
        appointmentDate,
        timeSlot
    } = req.body;

    // Validates patient, doctor availability, and slot conflicts
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
        timeSlot,
        createdByEmployeeId: req.user.employeeCode
    });

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentScheduled({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    // Log the appointment creation
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_CREATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_BOOKED(
            appointment.appointmentId,
            patient.name,
            doctor.name
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.APPOINTMENT.CREATED, {
        appointment
    });
};

// List all appointments with optional status/doctor/patient filters
exports.getAppointments = async (req, res) => {

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.doctorEmployeeId) {
        filter.doctorEmployeeId = partial(req.query.doctorEmployeeId);
    }

    if (req.query.patientUHID) {
        filter.patientUHID = partial(req.query.patientUHID);
    }

    return paginateAppointments(filter, req.query, res);
};

// List appointments belonging to the authenticated doctor
exports.getMyAppointments = async (req, res) => {

    const doctorEmployeeId = req.user.employeeCode;

    // Tab-aware per-tab pagination for the doctor view (today/upcoming/past/completed)
    if (req.query.tab) {
        return paginateDoctorTab(doctorEmployeeId, req.query.tab, req.query, res);
    }

    // Back-compat: no tab → status-filtered pagination
    const filter = { doctorEmployeeId };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    return paginateAppointments(filter, req.query, res);
};

// Fetch a single appointment
exports.getAppointmentById = async (req, res) => {

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
        appointmentId
    })
        .select("-__v")
        .lean();

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    // A doctor may only access their own appointments
    const actor = await resolveActor(req.user);
    if (actor.designation === "DOCTOR" && appointment.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
    }

    const [enriched] = await enrichAppointments([appointment]);

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.RETRIEVED, {
        appointment: enriched
    });
};

// Return the list of already-booked time slots for a doctor on a given date
exports.getBookedSlots = getBookedSlots;

// Cancel an appointment
exports.cancelAppointment = async (req, res) => {

    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    // A doctor may only cancel their own appointments
    const actor = await resolveActor(req.user);
    if (actor.designation === "DOCTOR" && appointment.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
    }

    await cancelAppointmentRecord(appointment, cancellationReason);

    // Log appointment cancellation
    await recordAudit({
        actor,
        action: "APPOINTMENT_CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_CANCELLED(
            appointment.appointmentId,
            cancellationReason
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.CANCELLED, {
        appointment
    });
};

// Update scheduling fields on a BOOKED appointment
exports.updateAppointment = async (req, res) => {

    const { appointmentId } = req.params;
    const {
        patientUHID,
        doctorEmployeeId,
        appointmentDate,
        timeSlot
    } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.status !== "BOOKED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ONLY_BOOKED_EDITABLE);
    }

    // A doctor may only reschedule (date/time) their own appointments
    const actor = await resolveActor(req.user);
    let effectivePatientUHID = patientUHID;
    let effectiveDoctorId = doctorEmployeeId;
    if (actor.designation === "DOCTOR") {
        if (appointment.doctorEmployeeId !== req.user.employeeCode) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
        }
        effectivePatientUHID = appointment.patientUHID;
        effectiveDoctorId = appointment.doctorEmployeeId;
    }

    // Reject no-op updates so no false audit log is written
    const hasChanges = hasFieldChanges(
        appointment,
        {
            patientUHID: effectivePatientUHID,
            doctorEmployeeId: effectiveDoctorId,
            appointmentDate,
            timeSlot
        },
        ["patientUHID", "doctorEmployeeId", "appointmentDate", "timeSlot"],
        { dateFields: ["appointmentDate"] }
    );
    if (!hasChanges) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.COMMON.NO_CHANGES);
    }

    // Re-validates excluding this appointment from duplicate checks
    const { patient, doctor } = await checkAppointmentValidity({
        patientUHID: effectivePatientUHID,
        doctorId: effectiveDoctorId,
        appointmentDate,
        timeSlot,
        excludeAppointmentId: appointmentId
    });

    appointment.patientUHID = effectivePatientUHID;
    appointment.doctorEmployeeId = effectiveDoctorId;
    appointment.appointmentDate = appointmentDate;
    appointment.timeSlot = timeSlot;
    await appointment.save();

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentUpdated({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    // Log appointment updation
    await recordAudit({
        actor,
        action: "APPOINTMENT_UPDATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_UPDATED(appointment.appointmentId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.UPDATED, {
        appointment
    });
};

// Mark an appointment UNATTENDED
exports.markUnattended = async (req, res) => {

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    const actor = await resolveActor(req.user);

    // A doctor may only act on their own appointments
    if (actor.designation === "DOCTOR" && appointment.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
    }

    if (appointment.status !== "BOOKED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ONLY_BOOKED_UNATTENDED);
    }

    appointment.status = "UNATTENDED";
    await appointment.save();

    // Notify the patient
    const patient = await Patient.findOne({ UHID: appointment.patientUHID }).select("name email");
    if (patient?.email) {
        await sendAppointmentEmail(patient.email, emailTemplates.appointmentUnattended({
            patientName: patient.name
        }));
    }

    // Log the action
    await recordAudit({
        actor,
        action: "APPOINTMENT_UNATTENDED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_MARKED_UNATTENDED(actor.designation, actor.name)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.UNATTENDED, {
        appointment
    });
};
