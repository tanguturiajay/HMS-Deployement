const mongoose = require("mongoose");
const Counter = require("./Counter");

const changeValueSchema = new mongoose.Schema(
    {
        old: {
            type: mongoose.Schema.Types.Mixed
        },
        new: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    { _id: false }
);

const profileChangeRequestSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            unique: true
        },
        employeeCode: {
            type: String,
            required: true
        },
        employeeName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        requestedChanges: {
            type: Map,
            of: changeValueSchema,
            required: true
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING"
        },
        reviewedBy: {
            type: String
        },
        reviewedAt: {
            type: Date
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

profileChangeRequestSchema.pre("save", async function () {
    if (this.isNew) {
        const counter = await Counter.findOneAndUpdate(
            { name: "profilechangerequests" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        this.requestId = `PCR-${String(counter.seq).padStart(6, "0")}`;
    }
});

module.exports = mongoose.model(
    "ProfileChangeRequest",
    profileChangeRequestSchema
);
