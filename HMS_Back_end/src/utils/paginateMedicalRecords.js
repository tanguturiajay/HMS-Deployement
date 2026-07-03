const MedicalRecord = require("../models/MedicalRecords");
const parsePagination = require("./parsePagination");
const { sendSuccess } = require("./apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Shared pagination for medical record lists returning only the summary columns shown in list views
const paginateMedicalRecords = async (filter, reqQuery, res) => {
    const { page, limit, skip } = parsePagination(reqQuery);

    const [medicalRecords, total] = await Promise.all([
        MedicalRecord.find(filter)
            .select(
                "medicalRecordId patientUHID patientName doctorEmployeeId doctorName appointmentId status created_at"
            )
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

module.exports = paginateMedicalRecords;
