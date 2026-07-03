const mongoose = require("mongoose");
const Counter = require("./Counter");

const nodeSchema = new mongoose.Schema(
    {
        nodeId: {
            type: String,
            unique: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        path: {
            type: String,
            required: true,
            trim: true
        },
        icon: {
            type: String,
            trim: true
        },
        
        allowedDesignations: [{
            type: String,
            enum: [
                "OWNER",
                "ADMIN",
                "DOCTOR",
                "RECEPTIONIST",
                "CASHIER",
                "NURSE",
                "LAB_TECH",
                "PHARMACIST"
            ]
        }]
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

nodeSchema.pre("save", async function () {

    if (this.isNew) {

        const counter =
            await Counter.findOneAndUpdate(
                {
                    name: "nodes"
                },

                {
                    $inc: {
                        seq: 1
                    }
                },

                {
                    returnDocument: "after",
                    upsert: true
                }
            );

        this.nodeId = `NODE-${String(counter.seq).padStart(6, "0")}`;
    }
});

module.exports = mongoose.model("Node", nodeSchema);