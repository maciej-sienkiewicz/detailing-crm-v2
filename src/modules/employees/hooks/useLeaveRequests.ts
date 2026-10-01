// src/modules/employees/hooks/useLeaveRequests.ts
//
// Cache wniosków urlopowych. Kolejka rozpatrujących żyje pod korzeniem modułu
// (['employees', 'leave-requests']), wnioski pracownika - osobno (['my-leave-requests']),
// bo samoobsługa nie jest częścią modułu kadrowego i widzi ją każdy pracownik.
//
// Zatwierdzenie i odwołanie zmieniają urlop jako FAKT (employee_leaves), więc po nich
// nieaktualny jest też kalendarz urlopów i historia urlopów na karcie pracownika.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsApi, myLeaveRequestsApi } from '../api/leaveRequestsApi';
import { useLeaveCalendar } from './useLeaves';
import type {
    CreateLeaveRequestPayload,
    EmployeeSignaturePayload,
    LeaveDecisionPayload,
    LeaveRequestQueueStatus,
    SubmitLeaveRequestPayload,
} from '../types';

export const MY_LEAVE_REQUESTS_KEY = ['my-leave-requests'] as const;
export const LEAVE_REQUESTS_KEY = ['employees', 'leave-requests'] as const;
const LEAVE_CALENDAR_KEY = ['employees', 'leave-calendar'] as const;
const LEAVES_KEY = ['employees', 'leaves'] as const;

const queueKey = (status: LeaveRequestQueueStatus) => [...LEAVE_REQUESTS_KEY, 'list', status] as const;
const pendingCountKey = [...LEAVE_REQUESTS_KEY, 'pending-count'] as const;
export const leaveRequestDetailKey = (id: string) => [...LEAVE_REQUESTS_KEY, 'detail', id] as const;

// ─── Samoobsługa ─────────────────────────────────────────────────────────────

export const useMyLeaveRequests = () => {
    return useQuery({
        queryKey: MY_LEAVE_REQUESTS_KEY,
        queryFn: myLeaveRequestsApi.list,
        // 404 = konto bez rekordu pracownika. To stan, a nie awaria - ponawianie nic nie da.
        retry: (count, error) => (error as { response?: { status?: number } })?.response?.status !== 404 && count < 2,
    });
};

/**
 * Licznik dni roboczych na żywo w kreatorze; bez obu dat nie pyta. Z `employeeId`
 * liczy dla wskazanej osoby (urlop dodawany przez administratora) - inny endpoint
 * i inny wpis cache, bo dni robocze zależą od pracownika, a nie od zalogowanego.
 */
export const useLeaveRequestPreview = (startDate: string, endDate: string, employeeId?: string | null) => {
    const enabled = !!startDate && !!endDate && endDate >= startDate && employeeId !== null;
    return useQuery({
        queryKey: employeeId
            ? [...LEAVE_REQUESTS_KEY, 'preview', employeeId, startDate, endDate]
            : [...MY_LEAVE_REQUESTS_KEY, 'preview', startDate, endDate],
        queryFn: () => employeeId
            ? leaveRequestsApi.preview(employeeId, startDate, endDate)
            : myLeaveRequestsApi.preview(startDate, endDate),
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
    });
};

/**
 * Kto jeszcze jest nieobecny w wybranym terminie - z kalendarza urlopów, bez osoby,
 * której dotyczy wniosek. Kalendarz to widok kadrowo-warsztatowy: kto go nie ma
 * (`enabled: false`), nie dostaje tej informacji, zamiast pytać API o 403.
 */
export const useAbsentColleagues = (startDate: string, endDate: string, excludeId: string | null, enabled: boolean) => {
    const rangeValid = !!startDate && !!endDate && endDate >= startDate;
    const { leaveDayMap } = useLeaveCalendar(
        enabled && rangeValid ? startDate : null,
        enabled && rangeValid ? endDate : null,
    );
    return useMemo(() => {
        if (!enabled || !rangeValid) return [];
        const names = new Map<string, string>();
        leaveDayMap.forEach(day => {
            if (day.date < startDate || day.date > endDate) return;
            day.employees.forEach(e => { if (e.id !== excludeId) names.set(e.id, e.fullName); });
        });
        return [...names.values()];
    }, [leaveDayMap, excludeId, enabled, rangeValid, startDate, endDate]);
};

const useInvalidateMine = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: MY_LEAVE_REQUESTS_KEY });
};

export const useCreateLeaveRequest = () => {
    return useMutation({
        mutationFn: (payload: CreateLeaveRequestPayload) => myLeaveRequestsApi.create(payload),
    });
};

export const useSubmitLeaveRequest = () => {
    const invalidate = useInvalidateMine();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: SubmitLeaveRequestPayload }) =>
            myLeaveRequestsApi.submit(id, payload),
        onSuccess: () => invalidate(),
    });
};

export const useWithdrawLeaveRequest = () => {
    const invalidate = useInvalidateMine();
    return useMutation({
        mutationFn: (id: string) => myLeaveRequestsApi.withdraw(id),
        onSettled: () => invalidate(),
    });
};

// ─── Rozpatrywanie ───────────────────────────────────────────────────────────

export const useLeaveRequestQueue = (status: LeaveRequestQueueStatus, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queueKey(status),
        queryFn: () => leaveRequestsApi.list(status),
        enabled: options?.enabled ?? true,
    });
};

/** Licznik przy „Pracownicy" w panelu: wnioski, które TEN użytkownik może rozpatrzyć. */
export const usePendingLeaveRequestsCount = (enabled: boolean) => {
    const { data } = useQuery({
        queryKey: pendingCountKey,
        queryFn: leaveRequestsApi.pendingCount,
        enabled,
        staleTime: 60_000,
        refetchInterval: enabled ? 5 * 60_000 : false,
    });
    return data ?? 0;
};

export const useLeaveRequestDetail = (id: string | null) => {
    return useQuery({
        queryKey: leaveRequestDetailKey(id ?? '__none'),
        queryFn: () => leaveRequestsApi.get(id as string),
        enabled: !!id,
        retry: false,
    });
};

/**
 * Po decyzji (i po odmowie z 409 - ktoś rozpatrzył wcześniej) kolejka, licznik
 * i szczegóły mają pokazać stan serwera, a urlop jako fakt - trafić do kalendarza.
 */
export const useInvalidateLeaveRequests = () => {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY });
        void queryClient.invalidateQueries({ queryKey: LEAVE_CALENDAR_KEY });
        void queryClient.invalidateQueries({ queryKey: LEAVES_KEY });
    };
};

export const useDecisionSession = () => {
    return useMutation({ mutationFn: (id: string) => leaveRequestsApi.decisionSession(id) });
};

export const useDecideLeaveRequest = () => {
    const invalidate = useInvalidateLeaveRequests();
    return useMutation({
        mutationFn: ({ id, decision, payload }: { id: string; decision: 'approve' | 'reject'; payload: LeaveDecisionPayload }) =>
            decision === 'approve' ? leaveRequestsApi.approve(id, payload) : leaveRequestsApi.reject(id, payload),
        onSettled: () => invalidate(),
    });
};

// ─── Urlop dodany przez administratora (ON_BEHALF) ───────────────────────────

/**
 * Podpis pracownika na urządzeniu studia zamienia szkic w zwykły PENDING - od tej
 * chwili wniosek stoi w kolejce (i w liczniku), nawet jeśli administrator nie
 * dokończy decyzji.
 */
export const useEmployeeSignature = () => {
    const invalidate = useInvalidateLeaveRequests();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: EmployeeSignaturePayload }) =>
            leaveRequestsApi.employeeSignature(id, payload),
        onSuccess: () => invalidate(),
    });
};

export const useCancelLeaveRequest = () => {
    const invalidate = useInvalidateLeaveRequests();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveRequestsApi.cancel(id, reason),
        onSettled: () => invalidate(),
    });
};
