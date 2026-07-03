const AuditLog = require("../models/AuditLogs");

// Write an audit log entry; failures are swallowed so auditing never breaks the calling operation
const recordAudit = async ({
    actor = {},
    actorType,
    actorId,
    action,
    targetType,
    targetId,
    ipAddress,
    message
}) => {
    try {
        await AuditLog.create({
            actorType,
            actorId: actorId ?? actor.employeeCode,
            actorEmployeeCode: actor.employeeCode,
            actorName: actor.name,
            actorDesignation: actor.designation,
            action,
            targetType,
            targetId,
            ipAddress,
            message
        });
    } catch (err) {
        console.error("Audit log error:", err.message);
    }
};

module.exports = recordAudit;