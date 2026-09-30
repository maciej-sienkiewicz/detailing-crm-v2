import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type {
    EmployeeFilters,
    CreateEmployeePayload,
    UpdateEmployeePayload,
    TerminateEmployeePayload,
    CreateAccountRequest,
    ChangePasswordRequest,
} from '../types';

// Jeden korzeń cache dla całego modułu. Lista zespołu żyła wcześniej pod
// ['settings', 'team'], a karta pracownika pod ['employees'] - zapis w jednym miejscu
// nie odświeżał drugiego i karta unieważniała oba klucze ręcznie.
export const EMPLOYEES_KEY = ['employees'] as const;
export const EMPLOYEE_LISTS_KEY = [...EMPLOYEES_KEY, 'list'] as const;
export const employeeDetailKey = (employeeId: string) => [...EMPLOYEES_KEY, 'detail', employeeId] as const;

export const useEmployees = (filters: EmployeeFilters, options?: { enabled?: boolean }) => {
    const { data, isLoading, isError, isFetching, error, refetch } = useQuery({
        queryKey: [...EMPLOYEE_LISTS_KEY, filters],
        queryFn: () => employeeApi.listEmployees(filters),
        enabled: options?.enabled ?? true,
    });
    return {
        employees: data?.items ?? [],
        pagination: data?.pagination ?? null,
        isLoading,
        isError,
        isFetching,
        error,
        refetch,
    };
};

export const useEmployee = (employeeId: string) => {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: employeeDetailKey(employeeId),
        queryFn: () => employeeApi.getEmployee(employeeId),
        enabled: !!employeeId,
    });
    return { employee: data, isLoading, isError, error, refetch };
};

/**
 * Po zmianie osoby nieaktualne są listy (nazwisko, stan konta, rola) i - jeśli wiadomo,
 * kogo dotyczyła - jej karta. Reszta modułu (urlopy, wnioski, rozliczenia) zostaje.
 */
export const useInvalidateEmployees = () => {
    const queryClient = useQueryClient();
    return (employeeId?: string) => {
        void queryClient.invalidateQueries({ queryKey: EMPLOYEE_LISTS_KEY });
        if (employeeId) void queryClient.invalidateQueries({ queryKey: employeeDetailKey(employeeId) });
    };
};

export const useCreateEmployee = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: (payload: CreateEmployeePayload) => employeeApi.createEmployee(payload),
        onSuccess: () => invalidate(),
    });
};

export const useUpdateEmployee = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: UpdateEmployeePayload }) =>
            employeeApi.updateEmployee(employeeId, payload),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useTerminateEmployee = (employeeId: string) => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: (payload: TerminateEmployeePayload) => employeeApi.terminateEmployee(employeeId, payload),
        onSuccess: () => invalidate(employeeId),
    });
};

export const useDeleteEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (employeeId: string) => employeeApi.deleteEmployee(employeeId),
        onSuccess: (_data, employeeId) => {
            queryClient.removeQueries({ queryKey: employeeDetailKey(employeeId) });
            void queryClient.invalidateQueries({ queryKey: EMPLOYEE_LISTS_KEY });
        },
    });
};

// ─── Konto logowania ─────────────────────────────────────────────────────────

export const useCreateAccount = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: CreateAccountRequest }) =>
            employeeApi.createAccount(employeeId, payload),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useSetAccountBlocked = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: ({ employeeId, block }: { employeeId: string; block: boolean }) =>
            employeeApi.setAccountBlocked(employeeId, block),
        onSuccess: (_data, { employeeId }) => invalidate(employeeId),
    });
};

export const useDeleteAccount = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: (employeeId: string) => employeeApi.deleteAccount(employeeId),
        onSuccess: (_data, employeeId) => invalidate(employeeId),
    });
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: ({ employeeId, payload }: { employeeId: string; payload: ChangePasswordRequest }) =>
            employeeApi.changePassword(employeeId, payload),
    });
};

export const useResendInvitation = () => {
    const invalidate = useInvalidateEmployees();
    return useMutation({
        mutationFn: (employeeId: string) => employeeApi.resendInvitation(employeeId),
        onSuccess: (_data, employeeId) => invalidate(employeeId),
    });
};
