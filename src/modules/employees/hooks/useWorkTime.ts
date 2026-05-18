import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { SavePeriodPayload } from '../types';

const workTimeKey = (employeeId: string) => ['employees', 'worktime', employeeId];

export const useWorkTime = (employeeId: string, from?: string, to?: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...workTimeKey(employeeId), { from, to }],
        queryFn: () => employeeApi.listWorkTime(employeeId, from, to),
        enabled: !!employeeId,
    });
    return { entries: data ?? [], isLoading, isError, refetch };
};

export const useWorkTimePeriods = (employeeId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: [...workTimeKey(employeeId), 'periods'],
        queryFn: () => employeeApi.getWorkTimePeriods(employeeId),
        enabled: !!employeeId,
    });
    return { periods: data ?? [], isLoading, isError };
};

export const useDeleteWorkTimeEntry = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => employeeApi.deleteWorkTimeEntry(employeeId, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};

export const useSavePeriodWorkTime = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ period, payload }: { period: string; payload: SavePeriodPayload }) =>
            employeeApi.savePeriodWorkTime(employeeId, period, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};

export const useSubmitPeriodForBilling = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (period: string) => employeeApi.submitPeriodForBilling(employeeId, period),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};
