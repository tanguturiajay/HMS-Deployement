const mongoose = require("mongoose");
const Counter = require("./Counter");

const appointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        unique: true
    },
    patientUHID: {
        type: String,
        required: true,
        ref: "Patients"
    },
    doctorEmployeeId: {
        type: String,
        required: true,
        ref: "Employee"
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["BOOKED", "CANCELED", "COMPLETED", "UNATTENDED"],
        default: "BOOKED"
    },
    cancellationReason: {
        type: String
    },
    createdByEmployeeId: {
        type: String,
        ref: "Employee"
    }
});

appointmentSchema.pre('save', async function () {
    if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { name: 'appointments' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.appointmentId = `APT-${String(counter.seq).padStart(6, '0')}`;
    }
});

module.exports = mongoose.model("Appointments", appointmentSchema);