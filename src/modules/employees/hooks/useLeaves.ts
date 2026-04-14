import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type {
    RequestLeavePayload,
    ReviewLeavePayload,
    InitLeaveBalancePayload,
} from '../types';

const leavesKey = (employeeId: string) => ['employees', 'leaves', employeeId];
const leaveBalanceKey = (employeeId: string) => ['employees', 'leave-balance', employeeId];

export const useLeaves = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: leavesKey(employeeId),
        queryFn: () => employeeApi.listLeaves(employeeId),
        enabled: !!employeeId,
        staleTime: 30_000,
    });
    return { leaves: data ?? [], isLoading, isError, refetch };
};

export const useRequestLeave = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: RequestLeavePayload) => employeeApi.requestLeave(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: leavesKey(employeeId) }),
    });
};

export const useReviewLeave = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ leaveRequestId, payload }: { leaveRequestId: string; payload: ReviewLeavePayload }) =>
            employeeApi.reviewLeave(leaveRequestId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees', 'leaves'] });
        },
    });
};

export const useLeaveBalance = (employeeId: string, year?: number) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...leaveBalanceKey(employeeId), year],
        queryFn: () => employeeApi.getLeaveBalance(employeeId, year),
        enabled: !!employeeId,
        staleTime: 60_000,
    });
    const balance = Array.isArray(data) ? data : data ? [data] : [];
    return { balances: balance, isLoading, isError, refetch };
};

export const useInitLeaveBalance = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: InitLeaveBalancePayload) => employeeApi.initLeaveBalance(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: leaveBalanceKey(employeeId) }),
    });
};
