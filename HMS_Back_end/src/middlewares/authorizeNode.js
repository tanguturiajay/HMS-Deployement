const Employee = require("../models/Employees");
const AppError = require("../utils/AppError");
const nodeAccessCache = require("../utils/nodeAccessCache");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

// Gates a route group by the sidebar node that owns nodePath where only granted designations pass and the owner always passes as a lockout safety hatch
const authorizeNode = (nodePath) => {

    return async (req, res, next) => {

        if (!req.user) {
            throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
        }

        // OWNER is never gated by node membership
        if (req.user.roles?.includes("OWNER")) {
            return next();
        }

        const employee = await Employee.findOne({
            employeeCode: req.user.employeeCode
        });

        if (!employee) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
        }

        const allowedDesignations =
            await nodeAccessCache.getAllowedDesignations(nodePath);

        if (!allowedDesignations?.includes(employee.designation)) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
        }

        next();
    };
};

module.exports = authorizeNode;
