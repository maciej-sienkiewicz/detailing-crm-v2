import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import type { CreateRoleRequest, UpdateRoleRequest } from '../rbacTypes';

const ROLES_KEY = ['settings', 'roles'] as const;
const PERMISSIONS_KEY = ['settings', 'roles', 'permissions'] as const;

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

export const useDeleteRole = () => {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: (roleId: string) => rolesApi.deleteRole(roleId),
        onSuccess: () => invalidate(),
    });
};
