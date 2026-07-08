const mongoose = require("mongoose");
const { ALL_PERMISSIONS, PERMISSION_DESIGNATIONS } = require("../constants/permissions");

// One document per designation listing its granted action permissions
const permissionSchema = new mongoose.Schema(
    {
        designation: {
            type: String,
            enum: PERMISSION_DESIGNATIONS,
            required: true,
            unique: true
        },
        permissions: [{
            type: String,
            enum: ALL_PERMISSIONS
        }]
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

module.exports = mongoose.model("Permission", permissionSchema);