const { MEDICAL_DESIGNATIONS_SET, SPECIALIZATION_DESIGNATIONS_SET } = require("../constants/domain");

// Build the employee profile response object
const buildEmployeeProfile = (employee) => {

    const profile = {
        employeeCode: employee.employeeCode,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        qualification: employee.qualification,
    };

    // Include medical registration number for medical staff only
    if (MEDICAL_DESIGNATIONS_SET.has(employee.designation)) {
        profile.medicalRegistrationNumber = employee.medicalRegistrationNumber;
    }

    // Include specialization for designations that carry one
    if (SPECIALIZATION_DESIGNATIONS_SET.has(employee.designation)) {
        profile.specialization = employee.specialization;
    }

    // Include doctor-only scheduling fields
    if (employee.designation === "DOCTOR") {
        profile.consultationFee = employee.consultationFee;
        profile.availabilitySlots = employee.availabilitySlots;
        profile.bookingCutoffDate = employee.bookingCutoffDate;
    }

    return profile;
};

module.exports = buildEmployeeProfile;