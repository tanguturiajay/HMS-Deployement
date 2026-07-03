const Appointment = require("../models/Appointments");
const enrichAppointments = require("./enrichAppointments");
const listAppointments = require("./listAppointments");
const parsePagination = require("./parsePagination");
const { sendSuccess } = require("./apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Shared pagination + enrichment for appointment list endpoints
const paginateAppointments = async (filter, reqQuery, res) => {
    const { page, limit, skip } = parsePagination(reqQuery);

    if (reqQuery.date) {
        const start = new Date(reqQuery.date);
        const end = new Date(reqQuery.date);
        end.setHours(23, 59, 59, 999);
        filter.appointmentDate = { $gte: start, $lte: end };
    }

    // Fetch page and total in parallel, then attach patient/doctor names
    const [appointments, total] = await Promise.all([
        listAppointments(filter, skip, limit),
        Appointment.countDocuments(filter)
    ]);

    const enriched = await enrichAppointments(appointments);

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        appointments: enriched
    });
};

module.exports = paginateAppointments;
