const User = require("../models/Users");
const Employee = require("../models/Employees");
const Patient = require("../models/Patients");

// Reconciles DB indexes with current schemas and drops legacy unique indexes made reusable by soft delete
async function syncIndexes() {
    await Promise.all([
        User.syncIndexes(),
        Employee.syncIndexes(),
        Patient.syncIndexes(),
    ]);
}

module.exports = syncIndexes;
