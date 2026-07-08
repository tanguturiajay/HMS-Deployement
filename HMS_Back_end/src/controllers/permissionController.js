const Permission = require("../models/Permissions");
const Node = require("../models/Nodes");
const permissionCache = require("../utils/permissionCache");
const nodeAccessCache = require("../utils/nodeAccessCache");
const getEffectivePermissions = require("../utils/getEffectivePermissions");
const resolveDesignation = require("../utils/resolveDesignation");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
const {
    PERMISSION_DESIGNATIONS,
    PERMISSION_GROUPS,
    ALL_PERMISSIONS,
    CODE_RULES,
    isCodeAllowedForDesignation
} = require("../constants/permissions");

// All designation permission documents plus the catalog for the management page
exports.getPermissions = async (req, res) => {
    const [docs, nodes] = await Promise.all([
        Permission.find({}).select("designation permissions -_id"),
        Node.find({}).select("path allowedDesignations -_id")
    ]);
    const byDesignation = new Map(docs.map((doc) => [doc.designation, doc.permissions]));

    // Every designation appears with its reachable node paths and the owner row always shows the full catalog
    const permissions = PERMISSION_DESIGNATIONS.map((designation) => ({
        designation,
        permissions: designation === "OWNER"
            ? [...ALL_PERMISSIONS]
            : byDesignation.get(designation) ?? [],
        nodePaths: designation === "OWNER"
            ? nodes.map((node) => node.path)
            : nodes
                .filter((node) => node.allowedDesignations.includes(designation))
                .map((node) => node.path)
    }));

    return sendSuccess(res, STATUS.OK, MESSAGES.PERMISSION.LIST_RETRIEVED, {
        groups: PERMISSION_GROUPS,
        permissions
    });
};

// Replace a designation's granted permissions
exports.updatePermissions = async (req, res) => {
    const { designation } = req.params;

    if (designation === "OWNER") {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.PERMISSION.OWNER_LOCKED);
    }

    const permissions = [...new Set(req.body.permissions)];

    // A code must be grantable to the designation and its module node must already be granted
    for (const code of permissions) {
        if (!isCodeAllowedForDesignation(code, designation)) {
            throw new AppError(STATUS.UNPROCESSABLE_ENTITY, MESSAGES.PERMISSION.NOT_ELIGIBLE);
        }

        const nodePath = CODE_RULES.get(code)?.nodePath;
        if (nodePath) {
            const allowed = await nodeAccessCache.getAllowedDesignations(nodePath);
            if (!allowed?.includes(designation)) {
                throw new AppError(STATUS.UNPROCESSABLE_ENTITY, MESSAGES.PERMISSION.NODE_ACCESS_REQUIRED);
            }
        }
    }

    await Permission.findOneAndUpdate(
        { designation },
        { $set: { permissions } },
        { upsert: true, runValidators: true }
    );

    permissionCache.invalidate();

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        actorType: "EMPLOYEE",
        action: "PERMISSIONS_UPDATED",
        targetType: "PERMISSION",
        targetId: designation,
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.PERMISSIONS_UPDATED(designation)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.PERMISSION.UPDATED, {
        designation,
        permissions
    });
};

// The caller's effective permissions for client-side gating
exports.getMyPermissions = async (req, res) => {
    const designation = await resolveDesignation(req);
    const permissions = await getEffectivePermissions(req.user.roles, designation);

    return sendSuccess(res, STATUS.OK, MESSAGES.PERMISSION.MY_RETRIEVED, {
        permissions
    });
};