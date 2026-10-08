// src/modules/comms/inbox/useInboxNav.ts
// Stan skrzynki w adresie: zakładka, otwarta sprawa albo wątek, archiwum, nowa
// wiadomość. Adres jest jedynym źródłem - odświeżenie strony, link z powiadomienia
// i przycisk „wstecz" trafiają w to samo miejsce.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inboxTabFromParam, type InboxTab } from '../utils/inboxTabs';

export interface InboxLocation {
    tab: InboxTab;
    leadId: string | null;
    threadId: string | null;
    /** Zamknięte sprawy (tryb listy w zakładce Sprawy). */
    archive: boolean;
    /** Odrzucone przez automat (tryb listy w zakładce Poczta). */
    rejected: boolean;
    /** Nowa wiadomość od zera; `to` - adres wpisany z góry. */
    compose: { to: string } | null;
}

export function useInboxNav() {
    const [params, setParams] = useSearchParams();

    const location: InboxLocation = useMemo(
        () => ({
            tab: inboxTabFromParam(params.get('view')),
            leadId: params.get('lead'),
            threadId: params.get('thread'),
            archive: params.get('archive') === '1',
            rejected: params.get('folder') === 'rejected',
            compose: params.get('compose') === '1' ? { to: params.get('to') ?? '' } : null,
        }),
        [params]
    );

    const write = useCallback(
        (next: Partial<InboxLocation>) => {
            const merged = { ...location, ...next };
            const out: Record<string, string> = {};
            if (merged.tab !== 'sprawy') out.view = merged.tab;
            if (merged.tab === 'sprawy') {
                if (merged.archive) out.archive = '1';
                if (merged.leadId) out.lead = merged.leadId;
            } else {
                if (merged.rejected && merged.tab === 'poczta') out.folder = 'rejected';
                if (merged.compose) {
                    out.compose = '1';
                    if (merged.compose.to) out.to = merged.compose.to;
                } else if (merged.threadId) {
                    out.thread = merged.threadId;
                }
            }
            setParams(out, { replace: true });
        },
        [location, setParams]
    );

    return {
        location,
        /** Zmiana zakładki zaczyna od czystej listy - otwarte rzeczy należą do poprzedniej. */
        setTab: (tab: InboxTab) => tab !== location.tab && write({ tab, leadId: null, threadId: null, archive: false, rejected: false, compose: null }),
        openCase: (leadId: string | null) => write({ leadId }),
        openThread: (threadId: string | null) => write({ threadId, compose: null }),
        setArchive: (archive: boolean) => write({ archive, leadId: null }),
        setRejected: (rejected: boolean) => write({ rejected, threadId: null }),
        openCompose: (to = '') => write({ tab: location.tab === 'sprawy' ? 'poczta' : location.tab, compose: { to }, threadId: null }),
        closeCompose: () => write({ compose: null }),
        /** Po wysłaniu nowej wiadomości: wątek w Wysłanych. */
        showSent: (threadId: string) => write({ tab: 'wyslane', threadId, compose: null, rejected: false }),
    };
}
