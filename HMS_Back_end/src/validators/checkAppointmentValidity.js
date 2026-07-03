const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const validateEmployeeStatus = require("./validateEmployeeStatus");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Returns the filter with an appointmentId exclusion added when editing
const withExclusion = (filter, excludeAppointmentId) => {
  if (!excludeAppointmentId) return filter;
  return { ...filter, appointmentId: { $ne: excludeAppointmentId } };
};

// Midnight (local) of the given date-ish value
const startOfDay = (value) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
};

// Human-friendly day label, e.g. "Jun 17, 2026"
const formatDay = (day) =>
  day.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// Rejects appointment days before the doctor joined or on/after their booking cutoff
const assertDoctorDateBounds = (doctor, apptDay) => {
  if (doctor.joiningDate) {
    const joinDay = startOfDay(doctor.joiningDate);
    if (apptDay.getTime() < joinDay.getTime()) {
      throw new AppError(
        STATUS.CONFLICT,
        MESSAGES.APPOINTMENT.DOCTOR_NOT_JOINED(formatDay(joinDay))
      );
    }
  }

  if (doctor.bookingCutoffDate) {
    const cutoffDay = startOfDay(doctor.bookingCutoffDate);
    if (apptDay.getTime() >= cutoffDay.getTime()) {
      throw new AppError(
        STATUS.CONFLICT,
        MESSAGES.APPOINTMENT.AFTER_BOOKING_CUTOFF(formatDay(cutoffDay))
      );
    }
  }
};

// Validates all booking rules; throws on the first violation, returns patient and doctor
const checkAppointmentValidity = async ({
  patientUHID,
  doctorId,
  appointmentDate,
  timeSlot,
  excludeAppointmentId,
}) => {

  // Verify the patient exists
  const patient = await Patient.findOne({
    UHID: patientUHID,
  });

  if (!patient) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.DOESNT_EXIST);
  }

  // Throws when the doctor is missing, not a DOCTOR, or inactive
  const doctor = await validateEmployeeStatus(doctorId, "DOCTOR");

  // Reject past dates
  const todayStart = startOfDay(new Date());
  const apptDay = startOfDay(appointmentDate);

  if (apptDay.getTime() < todayStart.getTime()) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PAST_DATE);
  }

  // Reject dates more than 6 months ahead of today
  const maxBookingDay = new Date(todayStart);
  maxBookingDay.setMonth(maxBookingDay.getMonth() + 6);

  if (apptDay.getTime() > maxBookingDay.getTime()) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.TOO_FAR_AHEAD);
  }

  // For today's date, reject slots whose start time has already passed
  if (apptDay.getTime() === todayStart.getTime()) {
    const [slotStartHH, slotStartMM] = timeSlot
      .split("-")[0]
      .split(":")
      .map(Number);
    const slotStartMinutes = slotStartHH * 60 + slotStartMM;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (slotStartMinutes <= nowMinutes) {
      throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PAST_TIME);
    }
  }

  // Reject dates outside the doctor's joining / booking-cutoff window
  assertDoctorDateBounds(doctor, apptDay);

  // Derive the day-of-week from the appointment date and match it against the doctor's schedule
  const appointmentDay = new Date(appointmentDate)
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toUpperCase();

  const dayWindows = (doctor.availabilitySlots || []).filter(
    (slot) => slot.day === appointmentDay,
  );

  if (dayWindows.length === 0) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_UNAVAILABLE_DAY);
  }

  const [appointmentStartTime, appointmentEndTime] = timeSlot.split("-");

  // Check that the requested time slot falls within any of the doctor's availability windows
  const isValidTimeSlot = dayWindows.some(
    (w) =>
      appointmentStartTime >= w.startTime &&
      appointmentEndTime <= w.endTime,
  );

  if (!isValidTimeSlot) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_UNAVAILABLE_SLOT);
  }

  // Ensure the patient does not already have a non-cancelled appointment at this slot
  const patientAppointment = await Appointment.findOne(
    withExclusion(
      { patientUHID, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (patientAppointment) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PATIENT_SLOT_CONFLICT);
  }

  // Ensure the doctor does not already have a non-cancelled appointment at this slot
  const doctorAppointment = await Appointment.findOne(
    withExclusion(
      { doctorEmployeeId: doctorId, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (doctorAppointment) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_SLOT_CONFLICT);
  }

  return {
    patient,
    doctor,
  };
};

module.exports = checkAppointmentValidity;
