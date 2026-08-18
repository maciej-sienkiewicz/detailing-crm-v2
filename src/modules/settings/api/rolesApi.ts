import { apiClient } from '@/core';
import type {
    PermissionModuleTree,
    PermissionTreeNode,
    Role,
    RoleUser,
    CreateRoleRequest,
    UpdateRoleRequest,
    CreateRoleResponse,
    DeleteRoleOptions,
} from '../rbacTypes';

const BASE = '/v1/roles';

/** Mirrors RoleController.REASSIGN_TARGET_NONE: "leave the holders without a role". */
const REASSIGN_TARGET_NONE = 'none';

// ─── Permission catalog normalization ────────────────────────────────────────
// The backend serves the catalog as a tree; we only guarantee the recursive
// arrays exist so the editor can traverse without null checks.

const sanitizeNode = (node: PermissionTreeNode): PermissionTreeNode => ({
    code: node.code,
    displayName: node.displayName || node.code,
    description: node.description ?? null,
    section: node.section ?? null,
    featureKey: node.featureKey ?? null,
    implies: node.implies ?? [],
    children: (node.children ?? []).map(sanitizeNode),
});

const sanitizeCatalog = (data: PermissionModuleTree[] | null | undefined): PermissionModuleTree[] =>
    (data ?? []).map(module => ({
        ...module,
        featureKey: module.featureKey ?? null,
        nodes: (module.nodes ?? []).map(sanitizeNode),
    }));

export const rolesApi = {
    getPermissionCatalog: async (): Promise<PermissionModuleTree[]> => {
        const res = await apiClient.get<PermissionModuleTree[]>(`${BASE}/permissions`);
        return sanitizeCatalog(res.data);
    },

    listRoles: async (): Promise<Role[]> => {
        const res = await apiClient.get<Role[]>(BASE);
        return res.data;
    },

    getRole: async (roleId: string): Promise<Role> => {
        const res = await apiClient.get<Role>(`${BASE}/${roleId}`);
        return res.data;
    },

    createRole: async (payload: CreateRoleRequest): Promise<CreateRoleResponse> => {
        const res = await apiClient.post<CreateRoleResponse>(BASE, payload);
        return res.data;
    },

    updateRole: async (roleId: string, payload: UpdateRoleRequest): Promise<Role> => {
        const res = await apiClient.put<Role>(`${BASE}/${roleId}`, payload);
        return res.data;
    },

    listRoleUsers: async (roleId: string): Promise<RoleUser[]> => {
        const res = await apiClient.get<RoleUser[]>(`${BASE}/${roleId}/users`);
        return res.data;
    },

    /**
     * Without [options] a role that still has holders is refused; the guard stays in
     * place for callers that have not checked. Passing options hands the holders over
     * and deletes in one transaction, which is what the UI always does.
     */
    deleteRole: async (roleId: string, options?: DeleteRoleOptions): Promise<void> => {
        const params = options
            ? { reassignTo: options.reassignToRoleId ?? REASSIGN_TARGET_NONE }
            : undefined;
        await apiClient.delete(`${BASE}/${roleId}`, { params });
    },

    assignRole: async (userId: string, roleId: string | null): Promise<void> => {
        await apiClient.put(`${BASE}/assign/${userId}`, { roleId });
    },
};
