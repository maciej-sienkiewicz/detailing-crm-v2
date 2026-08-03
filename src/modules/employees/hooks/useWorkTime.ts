import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';

const teamKey = (userId: string) => ['worktime', 'team', userId];

export const useTeamWorkTimePeriods = (userId: string | null | undefined) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: teamKey(userId ?? ''),
        queryFn: () => employeeApi.getTeamWorkTimePeriods(userId!),
        enabled: !!userId,
    });
    return { periods: data ?? [], isLoading, isError, refetch };
};

export const useTeamWorkTimePeriod = (userId: string | null | undefined, period: string | null) => {
    const { data, isLoading } = useQuery({
        queryKey: [...teamKey(userId ?? ''), period],
        queryFn: () => employeeApi.getTeamWorkTimePeriod(userId!, period!),
        enabled: !!userId && !!period,
    });
    return { detail: data ?? null, isLoading };
};

export const useApproveTeamPeriod = (userId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (period: string) => employeeApi.approveTeamPeriod(userId, period),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey(userId) }),
    });
};

export const useReturnTeamPeriod = (userId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ period, note }: { period: string; note?: string }) =>
            employeeApi.returnTeamPeriod(userId, period, note),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey(userId) }),
    });
};
