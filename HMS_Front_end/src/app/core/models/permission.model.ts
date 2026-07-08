import { Designation } from './employee.model';
import { ApiResponse } from './api-response.model';

// One grantable action code; allowedDesignations whitelists holders, excludedDesignations blacklists
export interface PermissionDef {
    code: string;
    label: string;
    allowedDesignations?: Designation[];
    excludedDesignations?: Designation[];
}

// Module grouping used to render the permissions matrix; nodePath ties it to its sidebar node
export interface PermissionGroup {
    module: string;
    label: string;
    nodePath?: string | null;
    permissions: PermissionDef[];
}

// One designation row of granted codes plus the sidebar paths it can reach
export interface DesignationPermissions {
    designation: Designation;
    permissions: string[];
    nodePaths?: string[];
}

// GET /permissions response (catalog + all designation rows)
export type PermissionsResponse = ApiResponse<{
    groups: PermissionGroup[];
    permissions: DesignationPermissions[];
}>;

// GET /permissions/my-permissions response
export type MyPermissionsResponse = ApiResponse<{
    permissions: string[];
}>;

// PUT /permissions/update-permissions/:designation response
export type UpdatePermissionsResponse = ApiResponse<DesignationPermissions>;