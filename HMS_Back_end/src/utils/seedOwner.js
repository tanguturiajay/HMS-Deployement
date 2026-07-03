const bcrypt = require("bcryptjs");

const Counter = require("../models/Counter");
const Employee = require("../models/Employees");
const User = require("../models/Users");

const OWNER_EMPLOYEE = {
  employeeCode: "EMP-000001",
  name: "Hospital Owner",
  phone: "+91 9876543210",
  email: "owner@hospital.com",
  department: "Administration",
  designation: "OWNER",
  joiningDate: new Date(),
  qualification: ["MBA Hospital Administration"],
};

const OWNER_USER = {
  username: "owner",
  email: "owner@hospital.com",
  status: "ACTIVE",
  roles: ["OWNER"],
  employeeCode: "EMP-000001",
  mustChangePassword: false,
  createdByAdmin: false,
  approvedBy: null,
  approvedAt: null,
  createdBy: null,
  resetPasswordTokenHash: null,
  resetPasswordTokenExpiry: null,
  lastLoginAt: null,
};

// Ensures the employees counter, owner employee, and owner user exist; assumes an active connection
const seedOwner = async () => {
  const counterExists = await Counter.findOne({ name: "employees" });

  if (counterExists) {
    console.log("Skipped counter");
  } else {
    await Counter.create({
      name: "employees",
      seq: 1,
    });
    console.log("Created counter");
  }

  const employeeExists = await Employee.findOne({
    employeeCode: OWNER_EMPLOYEE.employeeCode,
  });

  if (employeeExists) {
    console.log("Skipped owner employee");
  } else {
    await Employee.create(OWNER_EMPLOYEE);
    console.log("Created owner employee");
  }

  const userExists = await User.findOne({
    username: OWNER_USER.username,
  });

  if (userExists) {
    console.log("Skipped owner user");
  } else {
    const ownerPassword = process.env.OWNER_PASS?.trim();
    if (!ownerPassword) {
      throw new Error("OWNER_PASS env variable is not set");
    }
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    await User.create({ ...OWNER_USER, passwordHash });
    console.log("Created owner user");
  }

  console.log("Owner seeded");
};

module.exports = seedOwner;
