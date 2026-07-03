const Appointment = require("../models/Appointments");

// Group order for mixed lists: upcoming (BOOKED) first, then finished statuses
const STATUS_PRIORITY = ["BOOKED", "COMPLETED", "UNATTENDED", "CANCELED"];

// Sorts BOOKED ascending and finished statuses descending using the full appointment start instant
const listAppointments = (filter, skip, limit) =>
    Appointment.aggregate([
        { $match: filter },
        {
            $addFields: {
                statusRank: { $indexOfArray: [STATUS_PRIORITY, "$status"] },
                startInstant: {
                    $let: {
                        vars: {
                            hm: {
                                $split: [
                                    { $arrayElemAt: [{ $split: ["$timeSlot", "-"] }, 0] },
                                    ":"
                                ]
                            }
                        },
                        in: {
                            $add: [
                                { $toLong: "$appointmentDate" },
                                {
                                    $multiply: [
                                        {
                                            $add: [
                                                { $multiply: [{ $toInt: { $arrayElemAt: ["$$hm", 0] } }, 60] },
                                                { $toInt: { $arrayElemAt: ["$$hm", 1] } }
                                            ]
                                        },
                                        60000
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                // BOOKED keeps the instant (ascending); finished statuses negate it (descending)
                orderValue: {
                    $cond: [
                        { $eq: ["$status", "BOOKED"] },
                        "$startInstant",
                        { $subtract: [0, "$startInstant"] }
                    ]
                }
            }
        },
        { $sort: { statusRank: 1, orderValue: 1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { __v: 0, statusRank: 0, startInstant: 0, orderValue: 0 } }
    ]);

module.exports = listAppointments;
