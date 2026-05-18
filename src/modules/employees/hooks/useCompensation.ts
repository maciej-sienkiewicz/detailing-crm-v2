import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { SetCompensationPayload } from '../types';

const compensationKey = (employeeId: string) => ['employees', 'compensation', employeeId];

export const useCurrentCompensation = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...compensationKey(employeeId), 'current'],
        queryFn: () => employeeApi.getCurrentCompensation(employeeId),
        enabled: !!employeeId,
    });
    return { compensation: data ?? null, isLoading, isError, refetch };
};

export const useCompensationHistory = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...compensationKey(employeeId), 'history'],
        queryFn: () => employeeApi.getCompensationHistory(employeeId),
        enabled: !!employeeId,
    });
    return { history: data ?? [], isLoading, isError, refetch };
};

export const useSetCompensation = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SetCompensationPayload) => employeeApi.setCompensation(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: compensationKey(employeeId) }),
    });
};
