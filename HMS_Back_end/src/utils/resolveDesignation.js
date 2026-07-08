const Employee = require("../models/Employees");

// Designation from the JWT claim, with a single memoized lookup for tokens minted before the claim existed
const resolveDesignation = async (req) => {
    if (req.user?.designation) {
        return req.user.designation;
    }

    if (req.employeeDesignation !== undefined) {
        return req.employeeDesignation;
    }

    const employee = await Employee.findOne({
        employeeCode: req.user?.employeeCode
    }).select("designation");

    req.employeeDesignation = employee?.designation ?? null;
    return req.employeeDesignation;
};

module.exports = resolveDesignation;