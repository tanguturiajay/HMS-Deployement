const mongoose = require("mongoose");
const Counter = require("./Counter");
const {
    ADMINISTRATION_CATEGORIES,
    ADMINISTRATION_METHODS,
    FOOD_RELATIONS
} = require("../constants/domain");

const medicalRecordSchema = new mongoose.Schema({
    medicalRecordId: {
        type: String,
        unique: true
    },
    appointmentId: {
        type: String,
        required: true,
        ref: "Appointments"
    },
    patientUHID: {
        type: String,
        required: true,
        ref: "Patients"
    },
    patientName: {
        type: String,
        required: true
    },
    doctorEmployeeId: {
        type: String,
        required: true,
        ref: "Employees"
    },
    doctorName: {
        type: String,
        required: true
    },
    chiefComplaint: {
        type: String,
        required: true
    },
    symptoms: {
        type: String,
        required: true
    },
    diagnosis: {
        type: String,
        required: true
    },
    advice: {
        type: String,
        required: true
    },
    prescriptionItems: {
        type: [{
            name: {type: String, required: true},
            dosage: {type: String, required: true},
            frequency: {type: String, required: true},
            duration: {type: String, required: true},
            foodTiming: {
                relation: {type: String, enum: FOOD_RELATIONS},
                offsetMinutes: {type: Number}
            },
            administrationCategory: {type: String, enum: ADMINISTRATION_CATEGORIES, required: true},
            administrationMethod: {type: String, enum: ADMINISTRATION_METHODS, required: true}
        }],
        default: undefined
    },
    medicalObservations: {
        type: [{
            metricName: {type: String, required: true},
            metricValue: {type: String, required: true},
            recordedTime: {type: Date, required: true}
        }],
        default: undefined
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ["DRAFT", "FINALIZED"],
        default: "DRAFT"
    },
    createdByEmployeeId: {
        type: String
    },
    createdByName: {
        type: String
    },
    createdByDesignation: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: undefined
    },
    deletedAt: {
        type: Date,
        default: undefined
    },
    deletedBy: {
        type: String,
        default: undefined
    }
}, {timestamps: { createdAt: "created_at", updatedAt: "updated_at" }}
);

medicalRecordSchema.pre('save', async function () {
    if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { name: 'medicalRecord' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.medicalRecordId = `MEDREC-${String(counter.seq).padStart(6, '0')}`;
    }
});

module.exports = mongoose.model("MedicalRecords", medicalRecordSchema);