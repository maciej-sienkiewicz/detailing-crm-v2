import { apiClient } from '@/core';
import type {
    PermissionModuleGroup,
    Role,
    CreateRoleRequest,
    UpdateRoleRequest,
    CreateRoleResponse,
} from '../rbacTypes';

const BASE = '/v1/roles';

export const rolesApi = {
    getPermissionCatalog: async (): Promise<PermissionModuleGroup[]> => {
        const res = await apiClient.get<PermissionModuleGroup[]>(`${BASE}/permissions`);
        return res.data;
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

    deleteRole: async (roleId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${roleId}`);
    },

    assignRole: async (userId: string, roleId: string | null): Promise<void> => {
        await apiClient.put(`${BASE}/assign/${userId}`, { roleId });
    },
};
