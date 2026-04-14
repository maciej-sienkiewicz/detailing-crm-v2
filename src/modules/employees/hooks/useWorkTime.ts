import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type {
    LogWorkTimePayload,
    ApproveWorkTimePayload,
    SaveDailyHoursPayload,
    AddWorkTimeBenefitPayload,
    SavePeriodPayload,
} from '../types';

const workTimeKey = (employeeId: string) => ['employees', 'worktime', employeeId];
const pendingWorkTimeKey = ['employees', 'worktime', 'pending'];

// ─── Existing hooks ───────────────────────────────────────────────────────────

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

// ─── New hooks for the monthly timesheet view ─────────────────────────────────

/**
 * Fetches the list of all monthly periods for an employee with aggregated
 * hour totals and status. Backed by the new
 * GET /v1/employees/{id}/worktime/periods endpoint.
 */
export const useWorkTimePeriods = (employeeId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: [...workTimeKey(employeeId), 'periods'],
        queryFn: () => employeeApi.getWorkTimePeriods(employeeId),
        enabled: !!employeeId,
        staleTime: 60_000,
    });
    return { periods: data ?? [], isLoading, isError };
};

/**
 * Mutation: create or replace the single REGULAR entry for a given date.
 * Backed by POST /v1/employees/{id}/worktime/daily.
 */
export const useSaveDailyHours = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SaveDailyHoursPayload) => employeeApi.saveDailyHours(employeeId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};

/**
 * Mutation: add a benefit (non-REGULAR) work-time entry for a specific date.
 * Backed by POST /v1/employees/{id}/worktime/benefit.
 */
export const useAddWorkTimeBenefit = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddWorkTimeBenefitPayload) => employeeApi.addWorkTimeBenefit(employeeId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};

/**
 * Mutation: delete a work-time entry (regular or benefit) by its ID.
 * Backed by DELETE /v1/employees/{id}/worktime/{entryId}.
 */
export const useDeleteWorkTimeEntry = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => employeeApi.deleteWorkTimeEntry(employeeId, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workTimeKey(employeeId) });
        },
    });
};

/**
 * Mutation: atomically save all regular and benefit entries for a monthly period.
 * Backed by PUT /v1/employees/{id}/worktime/periods/{period}.
 * The backend replaces all PENDING entries; APPROVED / REJECTED are left untouched.
 */
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
