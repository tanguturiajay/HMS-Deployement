const AppError = require("../utils/AppError");
const permissionCache = require("../utils/permissionCache");
const resolveDesignation = require("../utils/resolveDesignation");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Grants an action when the caller's designation holds the required permission codes while the owner always passes
const requirePermission = (requiredPermissions, requireAll = false) => {

    const permsToCheck = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

    return async (req, res, next) => {

        if (!req.user) {
            throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
        }

        // OWNER is never gated by permissions
        if (req.user.roles?.includes("OWNER")) {
            return next();
        }

        const designation = await resolveDesignation(req);
        const granted = await permissionCache.getPermissions(designation);

        const hasAccess = requireAll
            ? permsToCheck.every((code) => granted.includes(code))
            : permsToCheck.some((code) => granted.includes(code));

        if (!hasAccess) {
            throw new AppError(
                STATUS.FORBIDDEN,
                MESSAGES.AUTH.MISSING_PERMISSION(permsToCheck, requireAll),
                undefined,
                "FORBIDDEN"
            );
        }

        next();
    };
};

// Single code check for controller branches where the required permission depends on the request body
const hasPermission = async (req, code) => {
    if (req.user?.roles?.includes("OWNER")) {
        return true;
    }

    const designation = await resolveDesignation(req);
    const granted = await permissionCache.getPermissions(designation);
    return granted.includes(code);
};

module.exports = requirePermission;
module.exports.hasPermission = hasPermission;