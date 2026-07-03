const Node = require("../models/Nodes");
const Employee = require("../models/Employees");
const Counter = require("../models/Counter");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const parsePagination = require("../utils/parsePagination");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const nodeAccessCache = require("../utils/nodeAccessCache");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
const { CONTROL_PLANE_PATHS_SET, RESTRICTED_ROLES_SET } = require("../constants/domain");

// Escapes user input so it can be used safely inside a RegExp
const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// List sidebar nodes with optional search + pagination (OWNER management page)
exports.getNodes = async (req, res) => {

    const { page, limit, skip } = parsePagination(req.query, 10);

    const filter = {};

    if (req.query.search?.trim()) {
        const regex = new RegExp(escapeRegex(req.query.search.trim()), "i");
        filter.$or = [
            { name: regex },
            { path: regex },
            { nodeId: regex }
        ];
    }

    const [nodes, total] = await Promise.all([
        Node.find(filter)
            .select("-_id -__v")
            .sort({ created_at: 1 })
            .skip(skip)
            .limit(limit),
        Node.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalNodes: total,
        nodes
    });
};

// Create node
exports.createNode = async (req, res) => {

    const {
        name,
        path,
        icon,
        allowedDesignations
    } = req.body;

    // Check duplicate path
    const existingNode = await Node.findOne({ path });

    if (existingNode) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.NODE.PATH_EXISTS);
    }

    // Save the node to mongodb
    const node = await Node.create({
        name,
        path,
        icon,
        allowedDesignations
    });

    // Drop the access cache so the new node is enforced immediately
    nodeAccessCache.invalidate();

    // Log the creation
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "NODE_CREATED",
        targetType: "NODE",
        targetId: node.nodeId,
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.NODE_CREATED(node.name, node.nodeId)
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.NODE.CREATED, {
        node
    });
};

// Update node
exports.updateNode = async (req, res) => {

    // A node path is immutable after creation so seedNodes can match defaults by path without ever creating duplicates
    const {
        name,
        icon,
        allowedDesignations
    } = req.body;

    const updateData = {};

    if (name !== undefined) {
        updateData.name = name;
    }

    if (icon !== undefined) {
        updateData.icon = icon;
    }

    if (allowedDesignations !== undefined) {

        // Management nodes stay OWNER/ADMIN-only so they never become dead links
        const existing = await Node.findOne({ nodeId: req.params.nodeId }).select("path");

        if (existing && CONTROL_PLANE_PATHS_SET.has(existing.path)) {
            const hasStaffDesignation = allowedDesignations.some(
                (designation) => !RESTRICTED_ROLES_SET.has(designation)
            );

            if (hasStaffDesignation) {
                throw new AppError(STATUS.BAD_REQUEST, MESSAGES.NODE.SYSTEM_LOCKED);
            }
        }

        updateData.allowedDesignations = allowedDesignations;
    }

    const updatedNode = await Node.findOneAndUpdate(
        {
            nodeId: req.params.nodeId
        },

        updateData,

        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedNode) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.NODE.NOT_FOUND);
    }

    // Drop the access cache so the new designations are enforced immediately
    nodeAccessCache.invalidate();

    // Log the update
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "NODE_UPDATED",
        targetType: "NODE",
        targetId: updatedNode.nodeId,
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.NODE_UPDATED(updatedNode.name, updatedNode.nodeId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.UPDATED, {
        node: updatedNode
    });
};

// Delete node
exports.deleteNode = async (req, res) => {

    const deletedNode =
        await Node.findOneAndDelete({
            nodeId: req.params.nodeId
        });

    if (!deletedNode) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.NODE.NOT_FOUND);
    }

    // Drop the access cache so the removed node stops granting access immediately
    nodeAccessCache.invalidate();

    // After a delete the remaining nodes are renumbered in ascending creation order so node IDs stay gapless and sequential without colliding on the unique index
    const remainingNodes = await Node.find({}).sort({ nodeId: 1 });

    let seq = 0;
    for (const node of remainingNodes) {
        seq += 1;
        const newNodeId = `NODE-${String(seq).padStart(6, "0")}`;

        if (String(node.nodeId) !== newNodeId) {
            node.nodeId = newNodeId;
            await node.save();
        }
    }

    // Reset the counter to the new highest sequence (0 when no nodes remain)
    await Counter.findOneAndUpdate(
        { name: "nodes" },
        { $set: { seq } },
        { upsert: true }
    );

    // Log the deletion (uses the node's original id, captured before renumbering)
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "NODE_DELETED",
        targetType: "NODE",
        targetId: deletedNode.nodeId,
        ipAddress: req.ip,
        message: MESSAGES.AUDIT.NODE_DELETED(deletedNode.name, deletedNode.nodeId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.DELETED);
};

// Get sidebar nodes
exports.getMyNodes = async (req, res) => {

    const employee = await Employee.findOne({
        employeeCode: req.user.employeeCode
    });

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    const designation = employee.designation;

    const nodes = await Node.find({

        allowedDesignations: designation

    })
        .select("-_id -__v")
        .sort({ created_at: 1 });

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.LIST_RETRIEVED, {
        totalNodes: nodes.length,
        nodes
    });
};
