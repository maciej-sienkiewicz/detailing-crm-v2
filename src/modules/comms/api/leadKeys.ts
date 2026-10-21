// src/modules/comms/api/leadKeys.ts
// Bez zależności od hooków: importują go useComms, kalendarz i edycja rezerwacji,
// a useLeads sam importuje z useComms.
import type { QueryClient } from '@tanstack/react-query';

export const LEADS_KEY = ['leads'];
export const LEAD_DICTIONARIES_KEY = [...LEADS_KEY, 'dictionaries'];
export const LEAD_ANALYTICS_KEY = [...LEADS_KEY, 'analytics'];
export const LEAD_OVERVIEW_KEY = [...LEADS_KEY, 'overview'];

export const leadKeys = {
    /** Listy z licznikiem „wymaga uwagi" w Sidebarze. */
    lists: [...LEADS_KEY, 'list'],
    details: [...LEADS_KEY, 'detail'],
    detail: (leadId: string) => [...LEADS_KEY, 'detail', leadId],
    history: (leadId: string) => [...LEADS_KEY, 'history', leadId],
};

/**
 * Zmiana jednej sprawy: lista, analityka i - gdy znamy sprawę - jej szczegół i przebieg.
 * Dawniej kilka miejsc unieważniało cały `['leads']`, czyli także słowniki, webhooki
 * i przegląd, które od tego się nie zmieniają.
 */
export const invalidateLead = (queryClient: QueryClient, leadId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: leadKeys.lists });
    queryClient.invalidateQueries({ queryKey: LEAD_ANALYTICS_KEY });
    if (leadId) {
        queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.history(leadId) });
    }
};
