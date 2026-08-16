import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import type { CreateRoleRequest, UpdateRoleRequest, DeleteRoleOptions } from '../rbacTypes';

const ROLES_KEY = ['settings', 'roles'] as const;
const PERMISSIONS_KEY = ['settings', 'roles', 'permissions'] as const;
const TEAM_KEY = ['settings', 'team'] as const;

const roleUsersKey = (roleId: string) => [...ROLES_KEY, 'users', roleId] as const;

export const usePermissionCatalog = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: PERMISSIONS_KEY,
        queryFn: rolesApi.getPermissionCatalog,
        staleTime: 1000 * 60 * 30, // catalog is hardcoded — cache aggressively
    });

    return { catalog: data ?? [], isLoading, isError };
};

export const useRoles = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ROLES_KEY,
        queryFn: rolesApi.listRoles,
    });

    return { roles: data ?? [], isLoading, isError, refetch };
};

const useInvalidateRoles = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ROLES_KEY });
};

export const useCreateRole = () => {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: (payload: CreateRoleRequest) => rolesApi.createRole(payload),
        onSuccess: () => invalidate(),
    });
};

export const useUpdateRole = () => {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: ({ roleId, payload }: { roleId: string; payload: UpdateRoleRequest }) =>
            rolesApi.updateRole(roleId, payload),
        onSuccess: () => invalidate(),
    });
};

/** Who holds a role. Only fetched once the hand-over dialog asks for names. */
export const useRoleUsers = (roleId: string | null) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: roleUsersKey(roleId ?? '__none'),
        queryFn: () => rolesApi.listRoleUsers(roleId as string),
        enabled: !!roleId,
    });

    return { users: data ?? [], isLoading, isError };
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, options }: { roleId: string; options?: DeleteRoleOptions }) =>
            rolesApi.deleteRole(roleId, options),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_KEY });
            // A hand-over rewrites employees' roles, so the team list is stale too.
            queryClient.invalidateQueries({ queryKey: TEAM_KEY });
        },
    });
};
