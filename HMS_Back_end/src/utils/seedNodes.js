const Node = require("../models/Nodes");

// Paths enforced by authorizeNode where a missing node would lock everyone but the owner out of the module so seeding fails fast when one is gone
const NODE_DRIVEN_PATHS = [
    "/dashboard/admins",
    "/dashboard/employees",
    "/dashboard/approvals",
    "/dashboard/patients",
    "/dashboard/appointments",
    "/dashboard/medical-records",
    "/dashboard/permissions"
];

// Default sidebar nodes recreated on boot when missing where array order sets the sidebar order by creation time
const DEFAULT_NODES = [
    {
        name: "Admins",
        path: "/dashboard/admins",
        icon: "shield",
        allowedDesignations: ["OWNER"]
    },
    {
        name: "Employees",
        path: "/dashboard/employees",
        icon: "users",
        allowedDesignations: ["OWNER", "ADMIN"]
    },
    {
        name: "Approvals",
        path: "/dashboard/approvals",
        icon: "check-circle",
        allowedDesignations: ["OWNER", "ADMIN"]
    },
    {
        name: "Patients",
        path: "/dashboard/patients",
        icon: "heart-pulse",
        allowedDesignations: ["OWNER", "ADMIN", "RECEPTIONIST"]
    },
    {
        name: "Appointments",
        path: "/dashboard/appointments",
        icon: "calendar",
        allowedDesignations: ["OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR"]
    },
    {
        name: "Medical Records",
        path: "/dashboard/medical-records",
        icon: "file-text",
        allowedDesignations: ["OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR"]
    },
    {
        // Owner-only page for managing the sidebar menu nodes themselves
        name: "Menu Nodes",
        path: "/dashboard/menu-nodes",
        icon: "menu",
        allowedDesignations: ["OWNER"]
    },
    {
        // Owner-only page for managing action permissions per designation
        name: "Permissions",
        path: "/dashboard/permissions",
        icon: "key",
        allowedDesignations: ["OWNER"]
    }
];

// Inserts missing default nodes matched by their immutable path and never updates existing ones so dashboard edits survive restarts
const seedNodes = async () => {
    let created = 0;
    let skipped = 0;

    for (const nodeData of DEFAULT_NODES) {
        const existing = await Node.findOne({ path: nodeData.path });

        if (existing) {
            skipped += 1;
            continue;
        }

        // Use save() instead of create() so the pre-save hook assigns nodeId
        const node = new Node(nodeData);
        await node.save();
        created += 1;
    }

    // One-shot icon fix: the old "user" icon duplicated the profile icon, skips owner-customized icons
    const migrated = await Node.updateOne(
        { path: "/dashboard/patients", icon: "user" },
        { $set: { icon: "heart-pulse" } }
    );

    if (migrated.modifiedCount > 0) {
        console.log("Patients node icon migrated from user to heart-pulse");
    }

    console.log(`Nodes seeded. Created: ${created}, Skipped: ${skipped}`);

    // Guard against a node-driven route losing its node and locking users out
    for (const path of NODE_DRIVEN_PATHS) {
        const node = await Node.findOne({ path });

        if (!node) {
            throw new Error(`Missing sidebar node for node-driven route ${path}`);
        }
    }
};

module.exports = seedNodes;