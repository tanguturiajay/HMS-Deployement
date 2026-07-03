const mongoose = require("mongoose");
const softDeletePlugin = require("../utils/softDeletePlugin");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "PENDING", "REJECTED"],
            default: "PENDING"
        },
        roles: [{
            type: String,
            enum: ["OWNER", "ADMIN", "STAFF"],
            required: true
        }],
        employeeCode: {
            type: String,
            unique: true,
            required: true
        },
        mustChangePassword: {
            type: Boolean,
            default: false
        },
        tokenVersion: {
            type: Number,
            default: 0
        },
        createdByAdmin: {
            type: Boolean,
            default: false
        },
        approvedBy: {
            type: String,
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        },
        createdBy: {
            type: String,
            default: null
        },
        resetPasswordTokenHash: {
            type: String,
            default: null
        },
        resetPasswordTokenExpiry:{
            type: Date,
            default: null
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: 'created_at', updatedAt: 'updated_at'
        }
    }
);

userSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("User", userSchema);