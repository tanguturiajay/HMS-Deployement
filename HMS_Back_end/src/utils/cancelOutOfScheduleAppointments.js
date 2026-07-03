const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const sendEmail = require("./sendEmail");
const emailTemplates = require("./emailTemplates");
const recordAudit = require("./recordAudit");
const fitsAvailability = require("./fitsAvailability");
const slotInstantMs = require("./slotInstantMs");
const MESSAGES = require("../constants/messages");

// True when the appointment's scheduled start (date + slot start) is still ahead (hospital time)
const startsInFuture = (appointment) => {
  const slotStart = (appointment.timeSlot || "").split("-")[0];
  const startMs = slotInstantMs(appointment.appointmentDate, slotStart);
  return !Number.isNaN(startMs) && startMs > Date.now();
};

// Cancels future BOOKED appointments that no longer fit the doctor's updated availability
async function cancelOutOfScheduleAppointments(doctor, actor) {

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const appointments = await Appointment.find({
    doctorEmployeeId: doctor.employeeCode,
    status: "BOOKED",
    appointmentDate: { $gte: todayStart }
  });

  const toCancel = appointments.filter(
    (a) =>
      startsInFuture(a) &&
      !fitsAvailability(doctor.availabilitySlots, a.appointmentDate, a.timeSlot)
  );

  if (!toCancel.length) return;

  const cancellationReason = "Doctor is no longer available at this time slot due to a schedule change";

  await Appointment.updateMany(
    { _id: { $in: toCancel.map((a) => a._id) } },
    { status: "CANCELED", cancellationReason }
  );

  for (const appointment of toCancel) {
    try {
      await recordAudit({
        actor,
        action: "APPOINTMENT_CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.DOCTOR_SCHEDULE_CHANGE_CANCELLATION(
          appointment.appointmentId,
          doctor.name,
          doctor.employeeCode
        ),
      });
    } catch (error_) {
      console.error(`Audit log failed for appointment ${appointment.appointmentId}:`, error_);
    }

    try {
      const patient = await Patient.findOne({ UHID: appointment.patientUHID }).select("name email");
      if (patient?.email) {
        await sendEmail({
          to: patient.email,
          ...emailTemplates.appointmentCanceled({
            patientName: patient.name,
            doctorName: doctor.name,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            cancellationReason,
          }),
        });
      }
    } catch (error_) {
      console.error(`Email failed for appointment ${appointment.appointmentId}:`, error_);
    }
  }
}

module.exports = cancelOutOfScheduleAppointments;
