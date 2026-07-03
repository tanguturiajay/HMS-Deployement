const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/nodeController");
const { STAFF_DESIGNATIONS, RESTRICTED_ROLES } = require("../constants/domain");

// Every designation that may be granted access to a node
const ALLOWED_DESIGNATIONS = [...RESTRICTED_ROLES, ...STAFF_DESIGNATIONS];

// All the routes require authentication
router.use(auth);

// Validates node name, path format, optional icon, and allowed designation values
const createNodeValidation = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Node name is required")
        .isLength({ max: 60 })
        .withMessage("Node name must be at most 60 characters"),

    body("path")
        .trim()
        .notEmpty()
        .withMessage("Node path is required")
        .matches(/^\/[\w\-/]*$/)
        .withMessage("Path must start with / and contain only letters, numbers, - and /"),

    body("icon")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 40 })
        .withMessage("Icon must be at most 40 characters"),

    body("allowedDesignations")
        .isArray({ min: 1 })
        .withMessage("At least one allowed designation is required"),

    body("allowedDesignations.*")
        .isIn(ALLOWED_DESIGNATIONS)
        .withMessage("Valid designation is required")
];

// Same as createNodeValidation but all fields are optional
const updateNodeValidation = [

    param("nodeId")
        .notEmpty()
        .withMessage("Node ID is required"),

    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Node name cannot be empty")
        .isLength({ max: 60 })
        .withMessage("Node name must be at most 60 characters"),

    // path is intentionally not accepted on update — a node's path is immutable

    body("icon")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 40 })
        .withMessage("Icon must be at most 40 characters"),

    body("allowedDesignations")
        .optional()
        .isArray({ min: 1 })
        .withMessage(
            "At least one allowed designation is required"
        ),

    body("allowedDesignations.*")
        .optional()
        .isIn(ALLOWED_DESIGNATIONS)
        .withMessage("Valid designation is required")
];

// Validates the nodeId URL parameter
const nodeIdValidation = [

    param("nodeId")
        .notEmpty()
        .withMessage("Node ID is required")
];

// Validates pagination + search query params for the list endpoint
const listNodesValidation = [

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("search")
        .optional()
        .trim()
];

// Node management routes (OWNER only — admins are intentionally excluded)
router.get(
    "/",
    authorizeRoles("OWNER"),
    listNodesValidation,
    validate,
    controller.getNodes
);

router.post(
    "/create-node",
    authorizeRoles("OWNER"),
    createNodeValidation,
    validate,
    controller.createNode
);

router.put(
    "/update-node/:nodeId",
    authorizeRoles("OWNER"),
    updateNodeValidation,
    validate,
    controller.updateNode
);

router.delete(
    "/delete-node/:nodeId",
    authorizeRoles("OWNER"),
    nodeIdValidation,
    validate,
    controller.deleteNode
);

// Returns the sidebar nodes visible to the authenticated user's designation
router.get(
    "/my-nodes",
    controller.getMyNodes
);

module.exports = router;
