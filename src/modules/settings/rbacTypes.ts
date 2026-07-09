// ─── Roles & Permissions (RBAC, Settings) ──────────────────────────────────────
// Types for the "Role i uprawnienia" settings tab.
//
// The permission catalog is a TREE (hardcoded on the backend): a node's children
// require the node itself, so granting a permission implies granting its whole
// ancestor chain. The editor renders the hierarchy and cascades selection along it.

/** Permission modules grouping (hardcoded on the backend, `PermissionModule`). */
export type PermissionModuleKey =
    | 'VISITS'
    | 'CUSTOMERS'
    | 'FINANCE'
    | 'EMPLOYEES'
    | 'COMMUNICATION'
    | 'STATISTICS'
    | 'LEADS'
    | 'TASKS'
    | 'SERVICES';

export interface PermissionTreeNode {
    code: string;
    displayName: string;
    description: string | null;
    /** Presentational group header among siblings (e.g. "Usługi"); null = ungrouped. */
    section: string | null;
    /** Non-null when the permission is gated by a different subscription feature than its module. */
    featureKey: string | null;
    /** Permissions that require this one. */
    children: PermissionTreeNode[];
}

export interface PermissionModuleTree {
    module: PermissionModuleKey;
    displayName: string;
    /** Subscription feature key required for the module to work at runtime; null = always available. */
    featureKey: string | null;
    /** Root permissions of the module. */
    nodes: PermissionTreeNode[];
}

export interface RolePermission {
    code: string;
    displayName: string;
    module: PermissionModuleKey;
    moduleDisplayName: string;
}

export interface Role {
    id: string;
    name: string;
    description: string | null;
    permissions: RolePermission[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateRoleRequest {
    name: string;
    description?: string | null;
    permissions: string[]; // permission codes
}

export type UpdateRoleRequest = CreateRoleRequest;

export interface CreateRoleResponse {
    roleId: string;
}

export interface AssignRoleRequest {
    roleId: string | null; // null = remove assignment
}
