const Permission = require("../models/Permissions");

// In memory map of designation to granted permissions that is lazily loaded and dropped on any permission update so changes apply next request
let cache = null;

const load = async () => {
    const docs = await Permission.find({}).select("designation permissions -_id");
    cache = new Map(docs.map((doc) => [doc.designation, doc.permissions]));
    return cache;
};

// Granted permissions for a designation, or an empty list when none were granted
const getPermissions = async (designation) => {
    if (!cache) {
        await load();
    }
    return cache.get(designation) ?? [];
};

// Called after any permission update so the next lookup reloads
const invalidate = () => {
    cache = null;
};

module.exports = { getPermissions, invalidate };