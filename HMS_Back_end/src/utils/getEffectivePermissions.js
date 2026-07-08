const permissionCache = require("./permissionCache");
const { ALL_PERMISSIONS } = require("../constants/permissions");

// Effective action permissions for a user where the owner always holds the full catalog
const getEffectivePermissions = async (roles, designation) => {
    if (roles?.includes("OWNER")) {
        return [...ALL_PERMISSIONS];
    }
    return permissionCache.getPermissions(designation);
};

module.exports = getEffectivePermissions;