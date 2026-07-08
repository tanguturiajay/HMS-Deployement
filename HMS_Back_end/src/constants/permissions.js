const { STAFF_DESIGNATIONS } = require("./domain");

// Every designation that owns a permissions document
const PERMISSION_DESIGNATIONS = ["OWNER", "ADMIN", ...STAFF_DESIGNATIONS];

// Action permission catalog grouped by module for the permissions page
// allowedDesignations whitelists who may hold a code, excludedDesignations blacklists, nodePath ties a group to the sidebar node it depends on
const PERMISSION_GROUPS = [
    {
        module: "ADMINS",
        label: "Admins",
        nodePath: "/dashboard/admins",
        permissions: [
            { code: "CREATE_ADMIN", label: "Create admin", allowedDesignations: ["ADMIN"] },
            { code: "UPDATE_ADMIN", label: "Update admin", allowedDesignations: ["ADMIN"] },
            { code: "DELETE_ADMIN", label: "Delete admin", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "EMPLOYEES",
        label: "Employees",
        nodePath: "/dashboard/employees",
        permissions: [
            { code: "CREATE_EMPLOYEE", label: "Create employee", allowedDesignations: ["ADMIN"] },
            { code: "UPDATE_EMPLOYEE", label: "Update employee", allowedDesignations: ["ADMIN"] },
            { code: "DELETE_EMPLOYEE", label: "Delete employee", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "APPROVALS",
        label: "Approvals",
        nodePath: "/dashboard/approvals",
        permissions: [
            { code: "APPROVE_EMPLOYEE", label: "Approve employee", allowedDesignations: ["ADMIN"] },
            { code: "REJECT_EMPLOYEE", label: "Reject employee", allowedDesignations: ["ADMIN"] },
            { code: "APPROVE_PROFILE_CHANGE", label: "Approve profile change", allowedDesignations: ["ADMIN"] },
            { code: "REJECT_PROFILE_CHANGE", label: "Reject profile change", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "AUDIT",
        label: "Audit",
        nodePath: null,
        permissions: [
            { code: "VIEW_AUDIT_LOGS", label: "View audit logs", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "PROFILE",
        label: "Profile",
        nodePath: null,
        permissions: [
            { code: "UPDATE_SELF", label: "Update own profile (needs approval)" },
            { code: "UPDATE_SELF_DIRECT", label: "Update own profile (saved directly)", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "PATIENTS",
        label: "Patients",
        nodePath: "/dashboard/patients",
        permissions: [
            { code: "CREATE_PATIENT", label: "Create patient" },
            { code: "UPDATE_PATIENT", label: "Update patient" },
            { code: "DELETE_PATIENT", label: "Delete patient", allowedDesignations: ["ADMIN"] }
        ]
    },
    {
        module: "APPOINTMENTS",
        label: "Appointments",
        nodePath: "/dashboard/appointments",
        permissions: [
            { code: "VIEW_ALL_APPOINTMENTS", label: "View all appointments", excludedDesignations: ["DOCTOR"] },
            { code: "VIEW_MY_APPOINTMENTS", label: "View my appointments", allowedDesignations: ["DOCTOR"] },
            { code: "CREATE_APPOINTMENT", label: "Create appointment" },
            { code: "UPDATE_APPOINTMENT", label: "Update appointment" },
            { code: "CANCEL_APPOINTMENT", label: "Cancel appointment" },
            { code: "MARK_APPOINTMENT_UNATTENDED", label: "Mark appointment unattended" }
        ]
    },
    {
        module: "MEDICAL_RECORDS",
        label: "Medical Records",
        nodePath: "/dashboard/medical-records",
        permissions: [
            { code: "VIEW_ALL_MEDICAL_RECORDS", label: "View all medical records", excludedDesignations: ["DOCTOR"] },
            { code: "VIEW_MY_MEDICAL_RECORDS", label: "View my medical records", allowedDesignations: ["DOCTOR"] },
            { code: "CREATE_MEDICAL_RECORD_DRAFT", label: "Create medical record as draft" },
            { code: "CREATE_AND_FINALIZE_MEDICAL_RECORD", label: "Create and finalize medical record" },
            { code: "VERIFY_AND_FINALIZE_MEDICAL_RECORD", label: "Verify and finalize medical record" },
            { code: "DELETE_MEDICAL_RECORD", label: "Delete medical record", allowedDesignations: ["ADMIN"] }
        ]
    }
];

const flatPermissions = PERMISSION_GROUPS.flatMap((group) => group.permissions);

const ALL_PERMISSIONS = flatPermissions.map((permission) => permission.code);

// Code → its designation rules plus the sidebar node its module depends on
const CODE_RULES = new Map(
    PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => [
            permission.code,
            {
                allowedDesignations: permission.allowedDesignations ?? null,
                excludedDesignations: permission.excludedDesignations ?? null,
                nodePath: group.nodePath ?? null
            }
        ])
    )
);

// Whether a designation may hold a code at all (node access is checked separately)
const isCodeAllowedForDesignation = (code, designation) => {
    const rule = CODE_RULES.get(code);

    if (!rule) {
        return false;
    }

    if (rule.allowedDesignations && !rule.allowedDesignations.includes(designation)) {
        return false;
    }

    return !rule.excludedDesignations?.includes(designation);
};

// Sidebar path → codes stripped when a designation loses that node
const PERMISSIONS_BY_NODE_PATH = new Map(
    PERMISSION_GROUPS
        .filter((group) => group.nodePath)
        .map((group) => [group.nodePath, group.permissions.map((p) => p.code)])
);

// Boot defaults that mirror the pre-permission behavior of each designation
const DEFAULT_PERMISSIONS_BY_DESIGNATION = {
    OWNER: [...ALL_PERMISSIONS],
    ADMIN: [
        "CREATE_EMPLOYEE",
        "UPDATE_EMPLOYEE",
        "DELETE_EMPLOYEE",
        "APPROVE_EMPLOYEE",
        "REJECT_EMPLOYEE",
        "APPROVE_PROFILE_CHANGE",
        "REJECT_PROFILE_CHANGE",
        "VIEW_AUDIT_LOGS",
        "UPDATE_SELF_DIRECT",
        "CREATE_PATIENT",
        "UPDATE_PATIENT",
        "DELETE_PATIENT",
        "VIEW_ALL_APPOINTMENTS",
        "CREATE_APPOINTMENT",
        "UPDATE_APPOINTMENT",
        "CANCEL_APPOINTMENT",
        "MARK_APPOINTMENT_UNATTENDED",
        "VIEW_ALL_MEDICAL_RECORDS",
        "CREATE_MEDICAL_RECORD_DRAFT",
        "DELETE_MEDICAL_RECORD"
    ],
    DOCTOR: [
        "UPDATE_SELF",
        "VIEW_MY_APPOINTMENTS",
        "UPDATE_APPOINTMENT",
        "CANCEL_APPOINTMENT",
        "MARK_APPOINTMENT_UNATTENDED",
        "VIEW_MY_MEDICAL_RECORDS",
        "CREATE_MEDICAL_RECORD_DRAFT",
        "CREATE_AND_FINALIZE_MEDICAL_RECORD",
        "VERIFY_AND_FINALIZE_MEDICAL_RECORD"
    ],
    RECEPTIONIST: [
        "UPDATE_SELF",
        "CREATE_PATIENT",
        "UPDATE_PATIENT",
        "VIEW_ALL_APPOINTMENTS",
        "CREATE_APPOINTMENT",
        "UPDATE_APPOINTMENT",
        "CANCEL_APPOINTMENT",
        "MARK_APPOINTMENT_UNATTENDED",
        "VIEW_ALL_MEDICAL_RECORDS",
        "CREATE_MEDICAL_RECORD_DRAFT"
    ],
    CASHIER: ["UPDATE_SELF"],
    NURSE: ["UPDATE_SELF"],
    LAB_TECH: ["UPDATE_SELF"],
    PHARMACIST: ["UPDATE_SELF"]
};

// Set variant for O(1) membership checks
const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

module.exports = {
    PERMISSION_DESIGNATIONS,
    PERMISSION_GROUPS,
    ALL_PERMISSIONS,
    ALL_PERMISSIONS_SET,
    CODE_RULES,
    PERMISSIONS_BY_NODE_PATH,
    isCodeAllowedForDesignation,
    DEFAULT_PERMISSIONS_BY_DESIGNATION
};