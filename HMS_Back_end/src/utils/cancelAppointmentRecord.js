const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const emailTemplates = require("./emailTemplates");
const sendAppointmentEmail = require("./sendAppointmentEmail");
const AppError = require("./AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Validates state, cancels the appointment, and notifies the patient by email
const cancelAppointmentRecord = async (appointment, cancellationReason) => {

    if (appointment.status === "CANCELED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ALREADY_CANCELLED);
    }

    if (appointment.status === "COMPLETED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.COMPLETED_CANNOT_CANCEL);
    }

    appointment.status = "CANCELED";
    appointment.cancellationReason = cancellationReason;
    await appointment.save();

    // Fetch patient and doctor to build the cancellation email
    try {
        const [patient, doctor] = await Promise.all([
            Patient.findOne({ UHID: appointment.patientUHID }).select("name email"),
            Employee.findOne({ employeeCode: appointment.doctorEmployeeId }).select("name")
        ]);
        if (patient?.email) {
            await sendAppointmentEmail(patient.email, emailTemplates.appointmentCanceled({
                patientName: patient.name,
                doctorName: doctor?.name,
                appointmentDate: appointment.appointmentDate,
                timeSlot: appointment.timeSlot,
                cancellationReason
            }));
        }
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }
};

module.exports = cancelAppointmentRecord;
