// src/modules/comms/hooks/useLeads.ts
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { leadsApi } from '../api/leadsApi';
import { COMMS_THREADS_KEY } from './useComms';
import type {
    DashboardSocketEvent,
    Lead,
    LeadPage,
    LeadServiceItemInput,
    LeadStatus,
    MarkThreadAsLeadRequest,
} from '../types';

export const LEADS_KEY = ['leads'];
export const LEAD_DICTIONARIES_KEY = [...LEADS_KEY, 'dictionaries'];
export const LEAD_ANALYTICS_KEY = [...LEADS_KEY, 'analytics'];

export const useLeads = (filters: {
    status?: LeadStatus;
    query?: string;
    awaitingReply?: boolean;
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

/**
 * Termin rezerwacji powiązanej z leadem.
 *
 * Lead niesie samo `appointmentId`, więc datę trzeba dobrać osobno. Świadomie
 * nie dokładamy jej do payloadu leada: WebSocket podmienia wiersz w tabeli tym
 * samym kształtem co REST, więc każde pole doklejone tylko w jednym z tych
 * miejsc gaśnie na ekranie po pierwszej zmianie statusu. Zapytanie idzie dopiero
 * przy otwartym oknie i tylko dla leada, który rezerwację faktycznie ma.
 */
export const useLeadAppointment = (appointmentId: string | null) =>
    useQuery({
        queryKey: ['lead-appointment', appointmentId],
        queryFn: () => appointmentApi.getAppointment(appointmentId!) as Promise<{
            schedule?: { startDateTime?: string };
        }>,
        enabled: appointmentId !== null,
        staleTime: 60_000,
        // Rezerwacji mogło już nie być (usunięta poza CRM-em) — bez ponawiania.
        retry: false,
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

/**
 * Usunięcie leada. Wiersz znika z listy od razu — czekanie na odświeżenie po
 * potwierdzonym kliknięciu „Usuń" wygląda jak zawieszenie, a nie jak ostrożność.
 */
export const useDeleteLead = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: (leadId: string) => leadsApi.deleteLead(leadId),
        onSuccess: (_result, leadId) => {
            queryClient.setQueriesData<LeadPage>({ queryKey: [...LEADS_KEY, 'list'] }, (page) => {
                if (!page) return page;
                if (!page.items.some((item) => item.id === leadId)) return page;
                return {
                    ...page,
                    items: page.items.filter((item) => item.id !== leadId),
                    total: Math.max(0, page.total - 1),
                };
            });
            queryClient.removeQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
            // Wątek odzyskuje możliwość ponownego oznaczenia — skrzynka musi o tym wiedzieć.
            queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY });
            invalidate();
        },
    });
};

/** Nowy tag w słowniku studia. */
export const useCreateLeadTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (label: string) => leadsApi.createTag(label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAD_DICTIONARIES_KEY }),
    });
};

/**
 * Usunięcie tagu ze słownika. Leady, które go mają, zachowują go w swojej historii —
 * dlatego unieważniamy też listę: etykiety na wierszach przestają być aktualne.
 */
export const useDeleteLeadTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => leadsApi.deleteTag(code),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEAD_DICTIONARIES_KEY });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
        },
    });
};

// ── Webhooki formularzy ──────────────────────────────────────────────────────

export const LEAD_INTAKE_KEY = [...LEADS_KEY, 'intake-webhooks'];

export const useLeadIntakeWebhooks = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: LEAD_INTAKE_KEY,
        queryFn: leadsApi.getIntakeWebhooks,
        enabled: options?.enabled ?? true,
    });

export const useLeadIntakeDeliveries = (webhookId: string | null) =>
    useQuery({
        queryKey: [...LEAD_INTAKE_KEY, 'deliveries', webhookId],
        queryFn: () => leadsApi.getIntakeDeliveries(webhookId!),
        enabled: webhookId !== null,
    });

export const useCreateLeadIntakeWebhook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, defaultTagCodes }: { name: string; defaultTagCodes: string[] }) =>
            leadsApi.createIntakeWebhook(name, defaultTagCodes),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAD_INTAKE_KEY }),
    });
};

export const useUpdateLeadIntakeWebhook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...request }: {
            id: string;
            name?: string;
            active?: boolean;
            fieldMapping?: string;
            defaultTagCodes?: string[];
        }) => leadsApi.updateIntakeWebhook(id, request),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAD_INTAKE_KEY }),
    });
};

export const useDeleteLeadIntakeWebhook = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => leadsApi.deleteIntakeWebhook(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAD_INTAKE_KEY }),
    });
};

export const useUpdateLeadTags = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, tags }: { leadId: string; tags: string[] }) =>
            leadsApi.updateTags(leadId, tags),
        onSuccess: (_lead, variables) => invalidate(variables.leadId),
    });
};

export const useUpdateLeadVehicle = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, vehicleBrand, vehicleModel }: {
            leadId: string;
            vehicleBrand: string | null;
            vehicleModel: string | null;
        }) => leadsApi.updateVehicle(leadId, vehicleBrand, vehicleModel),
        onSuccess: (_lead, variables) => invalidate(variables.leadId),
    });
};

/**
 * Nasłuch zmian leadów na topicu studia. Backend przysyła pełny wiersz, więc
 * podmieniamy go w cache zamiast odpytywać serwer — dzięki temu spinner przy
 * rozpoznawaniu auta zamienia się w wynik sam, bez odświeżania strony.
 */
export function useLeadsSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();

    const handleMessage = useCallback(
        (message: IMessage) => {
            let event: DashboardSocketEvent;
            try {
                event = JSON.parse(message.body);
            } catch {
                return;
            }
            if (event.type !== 'LEAD_UPDATED' && event.type !== 'LEAD_STATUS_CHANGED') return;

            const lead = event.payload as Lead;
            if (!lead?.id) return;

            queryClient.setQueriesData<LeadPage>({ queryKey: [...LEADS_KEY, 'list'] }, (page) => {
                if (!page) return page;
                const index = page.items.findIndex((item) => item.id === lead.id);
                if (index === -1) return page;
                const items = [...page.items];
                items[index] = lead;
                return { ...page, items };
            });
            queryClient.setQueryData([...LEADS_KEY, 'detail', lead.id], lead);
        },
        [queryClient]
    );

    const handlerRef = useRef(handleMessage);
    useEffect(() => {
        handlerRef.current = handleMessage;
    }, [handleMessage]);

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;
        return subscribeToTopic(
            `/topic/studio.${user.studioId}.dashboard`,
            (message) => handlerRef.current(message)
        );
    }, [isAuthenticated, user?.studioId]);
}

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

/**
 * Wycena leada i lista usług powiązanej rezerwacji to jedna lista — backend
 * przepisuje jedną w drugą. Dlatego po zapisie unieważniamy też kalendarz:
 * inaczej ten sam użytkownik widziałby w drugiej zakładce swoją poprzednią wersję.
 */
export const useUpdateLeadServices = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, services }: { leadId: string; services: LeadServiceItemInput[] }) =>
            leadsApi.updateServices(leadId, services),
        onSuccess: (_lead, { leadId }) => {
            invalidate(leadId);
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        },
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
