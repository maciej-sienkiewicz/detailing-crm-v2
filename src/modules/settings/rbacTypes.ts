// ─── Roles & Permissions (RBAC, Settings) ──────────────────────────────────────
// Types for the "Role i uprawnienia" settings tab.
//
// The permission catalog is a DEPENDENCY GRAPH (hardcoded on the backend): a tree —
// a node's children require the node itself, so granting a permission implies granting
// its whole ancestor chain — plus explicit implications (`implies`), which may point at
// another branch or module (e.g. creating visits implies managing customers). The editor
// renders the tree and cascades selection along both kinds of edges; the backend closes
// the persisted set over the same graph, so a role can never be inconsistent.

/**
 * Permission modules grouping (hardcoded on the backend, `PermissionModule`).
 * Customers/vehicles are no longer a module — they are the "Klienci i pojazdy"
 * section inside VISITS.
 */
export type PermissionModuleKey =
    | 'VISITS'
    | 'FINANCE'
    | 'EMPLOYEES'
    | 'COMMUNICATION'
    | 'MARKETING'
    | 'STATISTICS'
    | 'LEADS'
    | 'TASKS'
    | 'SERVICES'
    | 'AUDIT';

export interface PermissionTreeNode {
    code: string;
    displayName: string;
    description: string | null;
    /** Presentational group header among siblings (e.g. "Usługi"); null = ungrouped. */
    section: string | null;
    /** Non-null when the permission is gated by a different subscription feature than its module. */
    featureKey: string | null;
    /**
     * Codes this permission additionally requires beyond its parent chain (possibly in
     * another branch or module). Selecting this node must also select them.
     */
    implies: string[];
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
    trackWorkTime: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRoleRequest {
    name: string;
    description?: string | null;
    permissions: string[]; // permission codes
    trackWorkTime: boolean;
}

export type UpdateRoleRequest = CreateRoleRequest;

export interface CreateRoleResponse {
    roleId: string;
}

export interface AssignRoleRequest {
    roleId: string | null; // null = remove assignment
}
