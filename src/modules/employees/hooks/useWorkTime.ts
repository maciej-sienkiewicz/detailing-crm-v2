import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { LogWorkTimePayload, ApproveWorkTimePayload } from '../types';

const workTimeKey = (employeeId: string) => ['employees', 'worktime', employeeId];
const pendingWorkTimeKey = ['employees', 'worktime', 'pending'];

export const useWorkTime = (employeeId: string, from?: string, to?: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...workTimeKey(employeeId), { from, to }],
        queryFn: () => employeeApi.listWorkTime(employeeId, from, to),
        enabled: !!employeeId,
        staleTime: 30_000,
    });
    return { entries: data ?? [], isLoading, isError, refetch };
};

export const usePendingWorkTime = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: pendingWorkTimeKey,
        queryFn: () => employeeApi.listPendingWorkTime(),
        staleTime: 30_000,
    });
    return { entries: data ?? [], isLoading, isError, refetch };
};

export const useWorkTimeSummary = (employeeId: string, period: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: [...workTimeKey(employeeId), 'summary', period],
        queryFn: () => employeeApi.getWorkTimeSummary(employeeId, period),
        enabled: !!employeeId && !!period,
        staleTime: 60_000,
    });
    return { summary: data ?? null, isLoading, isError };
};

export const useLogWorkTime = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: LogWorkTimePayload) => employeeApi.logWorkTime(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) }),
    });
};

export const useApproveWorkTime = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, payload }: { entryId: string; payload: ApproveWorkTimePayload }) =>
            employeeApi.approveWorkTime(entryId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees', 'worktime'] });
        },
    });
};
