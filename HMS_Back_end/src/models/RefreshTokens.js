const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        subjectType: {
            type: String,
            enum: ["EMPLOYEE", "PATIENT"],
            required: true
        },
        subjectId: {
            type: String,
            required: true
        },
        familyId: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        revokedAt: {
            type: Date,
            default: null
        },
        replacedByHash: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        ip: {
            type: String,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ subjectType: 1, subjectId: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
