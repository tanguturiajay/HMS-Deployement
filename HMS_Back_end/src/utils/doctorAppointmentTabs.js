const Appointment = require("../models/Appointments");
const enrichAppointments = require("./enrichAppointments");
const paginateAppointments = require("./paginateAppointments");
const parsePagination = require("./parsePagination");
const { istDayStart, TZ_OFFSET_MS } = require("./slotInstantMs");
const { sendSuccess } = require("./apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const DAY_MS = 24 * 60 * 60 * 1000;

// Tabs whose membership hinges on the slot end time, so they need slotEndInstant
const SLOT_END_TABS = new Set(["today", "past"]);

// Today's [start, end) window in hospital time (Asia/Kolkata)
const todayRange = () => {
    const dayStart = istDayStart();
    return { dayStart, dayEnd: new Date(dayStart.getTime() + DAY_MS) };
};

// Adds slotEndInstant (epoch ms of the slot end) for slot-end-aware tabs
const withSlotEndInstant = [
    {
        $addFields: {
            slotEndMinutes: {
                $let: {
                    vars: {
                        hm: {
                            $split: [
                                { $arrayElemAt: [{ $split: ["$timeSlot", "-"] }, 1] },
                                ":",
                            ],
                        },
                    },
                    in: {
                        $add: [
                            { $multiply: [{ $toInt: { $arrayElemAt: ["$$hm", 0] } }, 60] },
                            { $toInt: { $arrayElemAt: ["$$hm", 1] } },
                        ],
                    },
                },
            },
        },
    },
    {
        $addFields: {
            slotEndInstant: {
                $subtract: [
                    {
                        $add: [
                            { $toLong: "$appointmentDate" },
                            { $multiply: ["$slotEndMinutes", 60000] },
                        ],
                    },
                    TZ_OFFSET_MS,
                ],
            },
        },
    },
];

// Base $match (pre-slotEnd) selecting a doctor's candidate rows for a tab
const doctorTabBaseMatch = (doctorEmployeeId, tab, { dayStart, dayEnd }) => {
    switch (tab) {
        case "today":
            return {
                doctorEmployeeId,
                status: "BOOKED",
                appointmentDate: { $gte: dayStart, $lt: dayEnd },
            };
        case "upcoming":
            return {
                doctorEmployeeId,
                status: "BOOKED",
                appointmentDate: { $gte: dayEnd },
            };
        case "past":
            return { doctorEmployeeId, status: "BOOKED" };
        case "completed":
            return { doctorEmployeeId, status: "COMPLETED" };
        default:
            return { doctorEmployeeId };
    }
};

// Post-slotEnd $expr for the slot-end tabs; null for the simple tabs
const doctorTabSlotEndExpr = (tab, { dayStart, dayEnd, nowMs }) => {
    if (tab === "today") {
        return { $gte: ["$slotEndInstant", nowMs] };
    }
    if (tab === "past") {
        return {
            $or: [
                { $lt: ["$appointmentDate", dayStart] },
                {
                    $and: [
                        { $gte: ["$appointmentDate", dayStart] },
                        { $lt: ["$appointmentDate", dayEnd] },
                        { $lt: ["$slotEndInstant", nowMs] },
                    ],
                },
            ],
        };
    }
    return null;
};

// Count a single doctor tab; simple tabs use countDocuments, slot-end tabs aggregate
const countDoctorTab = (doctorEmployeeId, tab, ctx) => {
    if (!SLOT_END_TABS.has(tab)) {
        return Appointment.countDocuments(doctorTabBaseMatch(doctorEmployeeId, tab, ctx));
    }
    return Appointment.aggregate([
        { $match: doctorTabBaseMatch(doctorEmployeeId, tab, ctx) },
        ...withSlotEndInstant,
        { $match: { $expr: doctorTabSlotEndExpr(tab, ctx) } },
        { $count: "count" },
    ]).then((agg) => agg[0]?.count || 0);
};

// All four doctor tab counts, sharing one time context (for badge totals)
const getDoctorTabCounts = async (doctorEmployeeId) => {
    const ctx = { ...todayRange(), nowMs: Date.now() };
    const [today, upcoming, pastDue, completed] = await Promise.all([
        countDoctorTab(doctorEmployeeId, "today", ctx),
        countDoctorTab(doctorEmployeeId, "upcoming", ctx),
        countDoctorTab(doctorEmployeeId, "past", ctx),
        countDoctorTab(doctorEmployeeId, "completed", ctx),
    ]);
    return { today, upcoming, pastDue, completed };
};

// Paginate one doctor tab and send the standard list envelope
const paginateDoctorTab = async (doctorEmployeeId, tab, reqQuery, res) => {
    const ctx = { ...todayRange(), nowMs: Date.now() };

    // Simple tabs reuse the shared find-based pagination + ordering
    if (!SLOT_END_TABS.has(tab)) {
        return paginateAppointments(doctorTabBaseMatch(doctorEmployeeId, tab, ctx), reqQuery, res);
    }

    // Slot-end tabs (today/past) need slotEndInstant computed before filtering
    const { page, limit, skip } = parsePagination(reqQuery);
    const [result] = await Appointment.aggregate([
        { $match: doctorTabBaseMatch(doctorEmployeeId, tab, ctx) },
        ...withSlotEndInstant,
        { $match: { $expr: doctorTabSlotEndExpr(tab, ctx) } },
        { $sort: { appointmentDate: 1, timeSlot: 1, _id: 1 } },
        {
            $facet: {
                rows: [
                    { $skip: skip },
                    { $limit: limit },
                    { $project: { __v: 0, slotEndMinutes: 0, slotEndInstant: 0 } },
                ],
                meta: [{ $count: "total" }],
            },
        },
    ]);

    const total = result?.meta?.[0]?.total || 0;
    const enriched = await enrichAppointments(result?.rows || []);

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        appointments: enriched,
    });
};

module.exports = {
    getDoctorTabCounts,
    paginateDoctorTab,
};
