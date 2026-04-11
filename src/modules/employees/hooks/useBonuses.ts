import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { CreateBonusPayload } from '../types';

const bonusesKey = (employeeId: string, period?: string) =>
    ['employees', 'bonuses', employeeId, ...(period ? [period] : [])];

export const useBonuses = (employeeId: string, period?: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: bonusesKey(employeeId, period),
        queryFn: () => employeeApi.listBonuses(employeeId, period),
        enabled: !!employeeId,
        staleTime: 60_000,
    });
    return { bonuses: data ?? [], isLoading, isError, refetch };
};

export const useCreateBonus = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateBonusPayload) => employeeApi.createBonus(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees', 'bonuses', employeeId] }),
    });
};

export const useDeleteBonus = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (bonusEntryId: string) => employeeApi.deleteBonus(employeeId, bonusEntryId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees', 'bonuses', employeeId] }),
    });
};
