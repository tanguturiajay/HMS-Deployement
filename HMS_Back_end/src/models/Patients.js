const mongoose = require("mongoose");
const Counter = require("./Counter");
const softDeletePlugin = require("../utils/softDeletePlugin");

const patientSchema = new mongoose.Schema({
    UHID: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female"],
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    address: {
        houseName: { type: String, required: true },
        houseNumber: { type: String, required: true },
        city: { type: String, required: true },
        postCode: { type: String, required: true }
    },
    emergencyContact: {
        contactName: { type: String, required: true },
        relationship: { type: String, required: true },
        contactNumber: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    },
    mustChangePassword: {
        type: Boolean,
        default: true
    },
    tokenVersion: {
        type: Number,
        default: 0
    },
    resetPasswordTokenHash: {
        type: String,
        default: undefined
    },
    resetPasswordTokenExpiry: {
        type: Date,
        default: undefined
    },
    createdByEmployeeId: {
        type: String,
    }
});

patientSchema.pre('save', async function () {
    if (this.isNew) {
        const counter = await Counter.findOneAndUpdate(
            { name: 'patients' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.UHID = `UHID-${String(counter.seq).padStart(6, '0')}`;
    }
});

patientSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Patients", patientSchema);