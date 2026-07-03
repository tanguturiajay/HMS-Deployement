const Appointment = require("../models/Appointments");
const AppError = require("./AppError");
const { sendSuccess } = require("./apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Shared handler: list already-booked time slots for a doctor on a given date
const getBookedSlots = async (req, res) => {

    const { doctorEmployeeId, date, excludeAppointmentId } = req.query;

    if (!doctorEmployeeId || !date) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.DOCTOR_AND_DATE_REQUIRED);
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Only BOOKED appointments occupy a slot
    const bookedSlotsFilter = {
        doctorEmployeeId,
        appointmentDate: { $gte: start, $lte: end },
        status: "BOOKED"
    };

    if (excludeAppointmentId) {
        bookedSlotsFilter.appointmentId = { $ne: excludeAppointmentId };
    }

    const appointments = await Appointment.find(bookedSlotsFilter).select("timeSlot -_id");
    const bookedSlots = appointments.map((a) => a.timeSlot);

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.BOOKED_SLOTS_RETRIEVED, {
        doctorEmployeeId,
        date,
        bookedSlots
    });
};

module.exports = getBookedSlots;
