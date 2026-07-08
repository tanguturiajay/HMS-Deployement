const Permission = require("../models/Permissions");
const {
    PERMISSION_DESIGNATIONS,
    ALL_PERMISSIONS,
    DEFAULT_PERMISSIONS_BY_DESIGNATION
} = require("../constants/permissions");

// Inserts missing permission documents per designation and never overwrites owner edits, except the OWNER row which is resynced to the full catalog so it auto-gains new codes
const seedPermissions = async () => {
    let created = 0;
    let skipped = 0;

    for (const designation of PERMISSION_DESIGNATIONS) {
        const existing = await Permission.findOne({ designation });

        if (existing) {
            skipped += 1;
            continue;
        }

        await Permission.create({
            designation,
            permissions: DEFAULT_PERMISSIONS_BY_DESIGNATION[designation] ?? []
        });
        created += 1;
    }

    // The owner row always reflects the full catalog
    await Permission.updateOne(
        { designation: "OWNER" },
        { $set: { permissions: [...ALL_PERMISSIONS] } }
    );

    console.log(`Permissions seeded. Created: ${created}, Skipped: ${skipped}`);
};

module.exports = seedPermissions;