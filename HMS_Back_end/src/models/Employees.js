const mongoose = require("mongoose");
const Counter = require("./Counter");
const softDeletePlugin = require("../utils/softDeletePlugin");

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    enum: [
      "OPD",
      "IPD",
      "Lab",
      "Pharmacy",
      "Administration",
      "Reception",
      "Billing",
    ],
    required: true,
  },
  designation: {
    type: String,
    enum: [
      "OWNER",
      "ADMIN",
      "DOCTOR",
      "RECEPTIONIST",
      "CASHIER",
      "NURSE",
      "LAB_TECH",
      "PHARMACIST",
    ],
    required: true,
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  medicalRegistrationNumber: {
    type: String,
  },
  specialization: {
    type: String,
  },
  bookingCutoffDate: {
    type: Date,
    default: undefined,
  },
  qualification: [
    {
      type: String,
      required: true,
    },
  ],
  consultationFee: {
    type: Number,
  },
  availabilitySlots: {
    type: [
      {
        day: {
          type: String,
          enum: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
          ],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],
    default: undefined,
  },
});

employeeSchema.pre("save", async function () {
  if (this.isNew && !this.employeeCode) {
    const counter = await Counter.findOneAndUpdate(
      { name: "employees" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.employeeCode = `EMP-${String(counter.seq).padStart(6, "0")}`;
  }
});

employeeSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Employee", employeeSchema);