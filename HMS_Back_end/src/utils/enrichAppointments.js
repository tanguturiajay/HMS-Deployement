const Employee = require("../models/Employees");
const Patient = require("../models/Patients");

// Attach patient and doctor display details to a list of plain appointment objects
const enrichAppointments = async (appointments) => {
    if (!appointments.length) {
        return [];
    }

    // Collect unique IDs then fetch all patients and doctors in two parallel queries
    const patientUHIDs = [
        ...new Set(appointments.map((a) => a.patientUHID))
    ];
    const doctorIds = [
        ...new Set(appointments.map((a) => a.doctorEmployeeId))
    ];

    const [patients, doctors] = await Promise.all([
        Patient.find({ UHID: { $in: patientUHIDs } }).select(
            "UHID name phone email"
        ),
        Employee.find({ employeeCode: { $in: doctorIds } }).select(
            "employeeCode name specialization department consultationFee"
        )
    ]);

    const patientMap = new Map(
        patients.map((p) => [p.UHID, p])
    );
    const doctorMap = new Map(
        doctors.map((d) => [d.employeeCode, d])
    );

    return appointments.map((appointment) => {
        const patient = patientMap.get(appointment.patientUHID);
        const doctor = doctorMap.get(appointment.doctorEmployeeId);

        return {
            ...appointment,
            patient: patient
                ? {
                      UHID: patient.UHID,
                      name: patient.name,
                      phone: patient.phone,
                      email: patient.email
                  }
                : null,
            doctor: doctor
                ? {
                      employeeCode: doctor.employeeCode,
                      name: doctor.name,
                      specialization: doctor.specialization,
                      department: doctor.department,
                      consultationFee: doctor.consultationFee
                  }
                : null
        };
    });
};

module.exports = enrichAppointments;
