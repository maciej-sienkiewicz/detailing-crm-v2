// ─── Roles & Permissions (RBAC, Settings) ──────────────────────────────────────
// Types for the "Role i uprawnienia" settings tab.

/** Permission modules grouping (hardcoded on the backend). */
export type PermissionModuleKey =
    | 'CALENDAR'
    | 'VISITS'
    | 'CUSTOMERS'
    | 'VEHICLES'
    | 'DOCUMENTS'
    | 'GALLERY'
    | 'FINANCE'
    | 'EMPLOYEES'
    | 'COMMUNICATION'
    | 'STATISTICS'
    | 'LEADS'
    | 'TASKS';

export interface PermissionCatalogItem {
    code: string;
    displayName: string;
    /** Permission codes that must be enabled alongside this one (direct prerequisites). */
    requires: string[];
}

export interface PermissionModuleGroup {
    module: PermissionModuleKey;
    displayName: string;
    /** Subscription feature key required for the module to work at runtime; null = always available. */
    featureKey: string | null;
    permissions: PermissionCatalogItem[];
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
