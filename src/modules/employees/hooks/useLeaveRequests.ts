// src/modules/employees/hooks/useLeaveRequests.ts
//
// Cache wniosków urlopowych. Kolejka rozpatrujących żyje pod korzeniem modułu
// (['employees', 'leave-requests']), wnioski pracownika - osobno (['my-leave-requests']),
// bo samoobsługa nie jest częścią modułu kadrowego i widzi ją każdy pracownik.
//
// Zatwierdzenie i odwołanie zmieniają urlop jako FAKT (employee_leaves), więc po nich
// nieaktualny jest też kalendarz urlopów i historia urlopów na karcie pracownika.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsApi, myLeaveRequestsApi } from '../api/leaveRequestsApi';
import type {
    CreateLeaveRequestPayload,
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

/** Licznik dni roboczych na żywo w kreatorze; bez obu dat nie pyta. */
export const useLeaveRequestPreview = (startDate: string, endDate: string) => {
    const enabled = !!startDate && !!endDate && endDate >= startDate;
    return useQuery({
        queryKey: [...MY_LEAVE_REQUESTS_KEY, 'preview', startDate, endDate],
        queryFn: () => myLeaveRequestsApi.preview(startDate, endDate),
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
    });
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

export const useCancelLeaveRequest = () => {
    const invalidate = useInvalidateLeaveRequests();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveRequestsApi.cancel(id, reason),
        onSettled: () => invalidate(),
    });
};
