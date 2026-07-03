// Escapes user input for safe use inside a RegExp (partial-match search)
const escapeRegex = (value) => String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Builds a Mongo filter for medical record listing that excludes soft deleted records and scopes a doctor to their own records
const buildMedicalRecordFilter = (query, doctorEmployeeId) => {
    const filter = { isDeleted: { $ne: true } };

    const partial = (value) => ({ $regex: escapeRegex(value), $options: "i" });

    if (doctorEmployeeId) {
        // Doctor: locked to own records; cannot search across doctors
        filter.doctorEmployeeId = doctorEmployeeId;
    } else {
        if (query.doctorEmployeeId) {
            filter.doctorEmployeeId = partial(query.doctorEmployeeId);
        }
        if (query.doctorName) {
            filter.doctorName = partial(query.doctorName);
        }
    }

    if (query.patientUHID) {
        filter.patientUHID = partial(query.patientUHID);
    }
    if (query.patientName) {
        filter.patientName = partial(query.patientName);
    }
    if (query.appointmentId) {
        filter.appointmentId = partial(query.appointmentId);
    }
    if (query.status) {
        filter.status = query.status;
    }

    return filter;
};

module.exports = buildMedicalRecordFilter;
