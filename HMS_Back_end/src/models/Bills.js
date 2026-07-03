const mongoose = require("mongoose");
const Counter = require("./Counter");

const billSchema = new mongoose.Schema({
    billId: {
        type: String,
        unique: true
    },
    patientUHID: {
        type: String,
        required: true,
        ref: "Patients"
    },
    appointmentId: {
        type: String,
        ref: "Appoinments"
    },
    items: [{
        serviceName: {type: String, required: true},
        amount: {type: Number, required: true}
    }],
    total: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "PAID", "PARTIAL"],
        default: "PENDING"
    },
    createdByEmployeeId: {
        type: String,
        required: true,
        ref: "Employees"
    }
});

billSchema.pre('save', async function () {
    if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { name: 'bill' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.billId = `B-${String(counter.seq).padStart(6, '0')}`;
    }
});

module.exports = mongoose.model("Bills", billSchema);