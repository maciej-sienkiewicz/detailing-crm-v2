import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workTimeApi } from '../api/workTimeApi';
import type { UpsertEntryRequest } from '../types';

export const workTimeKeys = {
    periods: () => ['worktime', 'periods'] as const,
    period: (period: string) => ['worktime', 'period', period] as const,
};

/** `enabled: false` - konto bez liczonego czasu pracy nie pyta API o 403. */
export function usePeriods(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: workTimeKeys.periods(),
        queryFn: workTimeApi.listPeriods,
        enabled: options?.enabled ?? true,
    });
}

export function usePeriodDetail(period: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: workTimeKeys.period(period),
        queryFn: () => workTimeApi.getPeriod(period),
        enabled: !!period && (options?.enabled ?? true),
    });
}

export function useUpsertEntry(period: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ date, payload }: { date: string; payload: UpsertEntryRequest }) =>
            workTimeApi.upsertEntry(date, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: workTimeKeys.period(period) });
            qc.invalidateQueries({ queryKey: workTimeKeys.periods() });
        },
    });
}

export function useDeleteEntry(period: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (date: string) => workTimeApi.deleteEntry(date),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: workTimeKeys.period(period) });
            qc.invalidateQueries({ queryKey: workTimeKeys.periods() });
        },
    });
}

export function useFillMonth(period: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => workTimeApi.fillMonth(period),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: workTimeKeys.period(period) });
            qc.invalidateQueries({ queryKey: workTimeKeys.periods() });
        },
    });
}

export function useStandardToday(period: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => workTimeApi.standardToday(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: workTimeKeys.period(period) });
            qc.invalidateQueries({ queryKey: workTimeKeys.periods() });
        },
    });
}

export function useSubmitPeriod(period: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => workTimeApi.submitPeriod(period),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: workTimeKeys.period(period) });
            qc.invalidateQueries({ queryKey: workTimeKeys.periods() });
        },
    });
}
