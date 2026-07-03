const User = require("../models/Users");
const Employee = require("../models/Employees");

// Soft deletes the Employee and linked User so history is preserved while freeing the email and username for reuse
async function deleteEmployeeAccount(employeeCode, deletedBy, { userStatus = "INACTIVE" } = {}) {
  const deletedAt = new Date();

  await Promise.all([
    Employee.updateOne(
      { employeeCode },
      { $set: { isDeleted: true, deletedAt, deletedBy } },
    ),
    User.updateOne(
      { employeeCode },
      { $set: { isDeleted: true, deletedAt, deletedBy, status: userStatus } },
    ),
  ]);
}

module.exports = deleteEmployeeAccount;
