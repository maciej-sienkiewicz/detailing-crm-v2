import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamApi } from '../api/teamApi';
import type {
    TeamEmployeeFilters,
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    CreateAccountRequest,
    ChangePasswordRequest,
} from '../teamTypes';

const TEAM_KEY = ['settings', 'team'] as const;

const listKey = (filters: TeamEmployeeFilters) => [...TEAM_KEY, 'list', filters] as const;
const detailKey = (employeeId: string) => [...TEAM_KEY, 'detail', employeeId] as const;

export const useEmployees = (filters: TeamEmployeeFilters) => {
    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: listKey(filters),
        queryFn: () => teamApi.listEmployees(filters),
    });

    return {
        items: data?.items ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
        isFetching,
        refetch,
    };
};

export const useEmployeeDetail = (employeeId: string | null) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: detailKey(employeeId ?? '__none'),
        queryFn: () => teamApi.getEmployee(employeeId as string),
        enabled: !!employeeId,
    });

    return { employee: data, isLoading, isError };
};

const useInvalidateTeam = () => {
    const queryClient = useQueryClient();
    return (employeeId?: string) => {
        queryClient.invalidateQueries({ queryKey: TEAM_KEY });
        if (employeeId) {
            queryClient.invalidateQueries({ queryKey: detailKey(employeeId) });
        }
    };
};

export const useCreateEmployee = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: (payload: CreateEmployeeRequest) => teamApi.createEmployee(payload),
        onSuccess: () => invalidate(),
    });
};

export const useUpdateEmployee = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: UpdateEmployeeRequest }) =>
            teamApi.updateEmployee(employeeId, payload),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useDeleteEmployee = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: (employeeId: string) => teamApi.deleteEmployee(employeeId),
        onSuccess: () => invalidate(),
    });
};

export const useCreateAccount = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: CreateAccountRequest }) =>
            teamApi.createAccount(employeeId, payload),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useSetAccountBlocked = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: ({ employeeId, block }: { employeeId: string; block: boolean }) =>
            teamApi.setAccountBlocked(employeeId, block),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useDeleteAccount = () => {
    const invalidate = useInvalidateTeam();
    return useMutation({
        mutationFn: (employeeId: string) => teamApi.deleteAccount(employeeId),
        onSuccess: (_data, employeeId) => invalidate(employeeId),
    });
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: ChangePasswordRequest }) =>
            teamApi.changePassword(employeeId, payload),
    });
};
