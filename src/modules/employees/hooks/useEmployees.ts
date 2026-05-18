import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type {
    EmployeeFilters,
    CreateEmployeePayload,
    UpdateEmployeePayload,
    TerminateEmployeePayload,
} from '../types';

export const EMPLOYEES_KEY = ['employees'];

export const useEmployees = (filters: EmployeeFilters) => {
    const queryKey = [...EMPLOYEES_KEY, 'list', filters];
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => employeeApi.listEmployees(filters),
    });
    return {
        employees: data?.items ?? [],
        pagination: data?.pagination ?? null,
        isLoading,
        isError,
        error,
        refetch,
    };
};

export const useEmployee = (employeeId: string) => {
    const queryKey = [...EMPLOYEES_KEY, 'detail', employeeId];
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => employeeApi.getEmployee(employeeId),
        enabled: !!employeeId,
    });
    return { employee: data, isLoading, isError, error, refetch };
};

export const useCreateEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateEmployeePayload) => employeeApi.createEmployee(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    });
};

export const useUpdateEmployee = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: UpdateEmployeePayload) => employeeApi.updateEmployee(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    });
};

export const useTerminateEmployee = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: TerminateEmployeePayload) => employeeApi.terminateEmployee(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    });
};
