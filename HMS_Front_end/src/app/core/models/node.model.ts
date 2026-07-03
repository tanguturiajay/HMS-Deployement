import { Designation } from './employee.model';
import { ApiResponse, PaginatedData } from './api-response.model';

export interface SidebarNode {
  nodeId: string;
  name: string;
  path: string;
  icon?: string;
  allowedDesignations: Designation[];
}

// Node enriched with audit timestamps, used on the owner management page
export interface MenuNode extends SidebarNode {
  created_at?: string;
  updated_at?: string;
}

// Management plane sidebar paths whose access stays fixed to owner and admin with designations locked in the editor so they never become dead links
export const CONTROL_PLANE_PATHS = new Set<string>([
  '/dashboard/admins',
  '/dashboard/employees',
  '/dashboard/approvals',
  '/dashboard/menu-nodes',
]);

// Every designation that may be granted access to a node
export const NODE_DESIGNATIONS: Designation[] = [
  'OWNER',
  'ADMIN',
  'DOCTOR',
  'RECEPTIONIST',
  'CASHIER',
  'NURSE',
  'LAB_TECH',
  'PHARMACIST',
];

// Create/update request bodies
export interface CreateNodePayload {
  name: string;
  path: string;
  icon?: string;
  allowedDesignations: Designation[];
}

export type UpdateNodePayload = Partial<CreateNodePayload>;

// GET /nodes/my-nodes response
export type MyNodesResponse = ApiResponse<{
  totalNodes: number;
  nodes: SidebarNode[];
}>;

// GET /nodes (paginated list) response
export type NodesResponse = ApiResponse<
  PaginatedData & {
    totalNodes: number;
    nodes: MenuNode[];
  }
>;

// POST /nodes/create-node and PUT /nodes/update-node/:nodeId response
export type NodeMutationResponse = ApiResponse<{ node: MenuNode }>;
