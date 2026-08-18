// src/modules/comms/hooks/useLeads.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leadsApi';
import { COMMS_THREADS_KEY } from './useComms';
import type { LeadServiceItemInput, LeadStatus, MarkThreadAsLeadRequest } from '../types';

export const LEADS_KEY = ['leads'];
export const LEAD_DICTIONARIES_KEY = [...LEADS_KEY, 'dictionaries'];
export const LEAD_ANALYTICS_KEY = [...LEADS_KEY, 'analytics'];

export const useLeads = (filters: {
    status?: LeadStatus;
    query?: string;
    page?: number;
    pageSize?: number;
}) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'list', filters],
        queryFn: () => leadsApi.getLeads(filters),
        placeholderData: (previous) => previous,
    });

export const useLead = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'detail', leadId],
        queryFn: () => leadsApi.getLead(leadId!),
        enabled: leadId !== null,
    });

export const useLeadHistory = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'history', leadId],
        queryFn: () => leadsApi.getHistory(leadId!),
        enabled: leadId !== null,
    });

export const useLeadDictionaries = () =>
    useQuery({
        queryKey: LEAD_DICTIONARIES_KEY,
        queryFn: leadsApi.getDictionaries,
        staleTime: Infinity,
    });

export const useLeadAnalytics = (from?: string, to?: string) =>
    useQuery({
        queryKey: [...LEAD_ANALYTICS_KEY, from, to],
        queryFn: () => leadsApi.getAnalytics(from, to),
    });

/** Liczba nowych leadów — plakietka w menu bocznym. */
export const useNewLeadsCount = (options?: { enabled?: boolean }): number => {
    const { data } = useQuery({
        queryKey: [...LEADS_KEY, 'list', { status: 'NEW' as LeadStatus, page: 0, pageSize: 1 }],
        queryFn: () => leadsApi.getLeads({ status: 'NEW', page: 0, pageSize: 1 }),
        select: (page) => page.total,
        enabled: options?.enabled ?? true,
    });
    return Number(data ?? 0);
};

const useLeadInvalidation = () => {
    const queryClient = useQueryClient();
    return (leadId?: string) => {
        queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: LEAD_ANALYTICS_KEY });
        if (leadId) {
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'history', leadId] });
        }
    };
};

export const useMarkThreadAsLead = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ threadId, request }: { threadId: string; request: MarkThreadAsLeadRequest }) =>
            leadsApi.markThreadAsLead(threadId, request),
        onSuccess: (_result, { threadId }) => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'detail', threadId] });
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
        },
    });
};

export const useChangeLeadStatus = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({
            leadId,
            status,
            lostReasonCode,
            lostNote,
        }: {
            leadId: string;
            status: LeadStatus;
            lostReasonCode?: string;
            lostNote?: string;
        }) => leadsApi.changeStatus(leadId, { status, lostReasonCode, lostNote }),
        onSuccess: (_lead, { leadId }) => invalidate(leadId),
    });
};

export const useUpdateLeadServices = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, services }: { leadId: string; services: LeadServiceItemInput[] }) =>
            leadsApi.updateServices(leadId, services),
        onSuccess: (_lead, { leadId }) => invalidate(leadId),
    });
};

export const useUpdateLead = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({
            leadId,
            request,
        }: {
            leadId: string;
            request: { category?: string; customerName?: string; assignedUserId?: string };
        }) => leadsApi.updateLead(leadId, request),
        onSuccess: (_lead, { leadId }) => invalidate(leadId),
    });
};

export const useCreateLead = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: leadsApi.createLead,
        onSuccess: () => invalidate(),
    });
};
