const Patient = require("../models/Patients");
const Appointment = require("../models/Appointments");
const User = require("../models/Users");
const Employee = require("../models/Employees");
const ProfileChangeRequest = require("../models/ProfileChangeRequests");
const resolveActor = require("../utils/resolveActor");
const { getDoctorTabCounts } = require("../utils/doctorAppointmentTabs");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Overview stats matching the Angular dashboard counts
exports.getAdminDashboardStats = async (req, res) => {
    const { designation } = await resolveActor(req.user);
    const includeAdmins = designation === "OWNER";

    const [activeStaff, adminCount, pendingStaff, pendingChanges, totalPatients, bookedAppointments] =
        await Promise.all([
            User.countDocuments({ roles: "STAFF", status: "ACTIVE" }),
            includeAdmins ? User.countDocuments({ roles: "ADMIN" }) : Promise.resolve(0),
            User.countDocuments({ roles: "STAFF", status: "PENDING" }),
            ProfileChangeRequest.countDocuments({ status: "PENDING" }),
            Patient.countDocuments({}),
            Appointment.countDocuments({ status: "BOOKED" }),
        ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.ADMIN_STATS_RETRIEVED, {
        stats: {
            activeEmployees: activeStaff + adminCount,
            pendingApprovals: pendingStaff + pendingChanges,
            totalPatients,
            bookedAppointments,
        },
    });
};

// Receptionist overview stats: total patients + all booked appointments.
exports.getReceptionistDashboardStats = async (req, res) => {
    const [totalPatients, bookedAppointments] = await Promise.all([
        Patient.countDocuments({}),
        Appointment.countDocuments({ status: "BOOKED" }),
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.RECEPTIONIST_STATS_RETRIEVED, {
        stats: { totalPatients, bookedAppointments },
    });
};

// Doctor stats aligned with appointment tab counts
exports.getDoctorDashboardStats = async (req, res) => {
    const stats = await getDoctorTabCounts(req.user.employeeCode);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.DOCTOR_STATS_RETRIEVED, {
        stats,
    });
};

// Dispatch dashboard stats based on employee designation
exports.getDashboardStats = async (req, res) => {
    const { designation } = await resolveActor(req.user);

    if (designation === "OWNER" || designation === "ADMIN") {
        return exports.getAdminDashboardStats(req, res);
    }
    if (designation === "DOCTOR") {
        return exports.getDoctorDashboardStats(req, res);
    }
    if (designation === "RECEPTIONIST") {
        return exports.getReceptionistDashboardStats(req, res);
    }
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.DASHBOARD.UNAUTHORIZED);
};

// Get Appointment Statistics
exports.getAppointmentStats = async (req, res) => {

    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
        filter.appointmentDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const total = await Appointment.countDocuments(filter);
    const completed = await Appointment.countDocuments({ ...filter, status: 'COMPLETED' });
    const booked = await Appointment.countDocuments({ ...filter, status: 'BOOKED' });
    const canceled = await Appointment.countDocuments({ ...filter, status: 'CANCELED' });

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.APPOINTMENT_STATS_RETRIEVED, {
        stats: {
            total,
            completed,
            booked,
            canceled,
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%'
        }
    });
};

// Get Patient Statistics
exports.getPatientStats = async (req, res) => {

    const total = await Patient.countDocuments({ status: 'ACTIVE' });
    const inactive = await Patient.countDocuments({ status: 'INACTIVE' });
    const byGender = await Patient.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.PATIENT_STATS_RETRIEVED, {
        stats: {
            total,
            active: total,
            inactive,
            byGender
        }
    });
};

// Get Employee Statistics
exports.getEmployeeStats = async (req, res) => {

    const total = await User.countDocuments({ roles: 'STAFF' });
    const active = await User.countDocuments({ roles: 'STAFF', status: 'ACTIVE' });
    const pending = await User.countDocuments({ roles: 'STAFF', status: 'PENDING' });
    const inactive = await User.countDocuments({ roles: 'STAFF', status: 'INACTIVE' });

    // By designation
    const byDesignation = await Employee.aggregate([
        { $group: { _id: '$designation', count: { $sum: 1 } } }
    ]);

    // By department
    const byDepartment = await Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.EMPLOYEE_STATS_RETRIEVED, {
        stats: {
            total,
            active,
            pending,
            inactive,
            byDesignation,
            byDepartment
        }
    });
};
