// src/modules/comms/inbox/useInboxNav.ts
// Stan skrzynki w adresie: zakładka, otwarta sprawa albo wątek, archiwum, nowa
// wiadomość. Adres jest jedynym źródłem - odświeżenie strony, link z powiadomienia
// i przycisk „wstecz" trafiają w to samo miejsce.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inboxTabFromParam, inboxTabParam, type InboxScope, type InboxTab } from '../utils/inboxTabs';

export interface InboxLocation {
    tab: InboxTab;
    leadId: string | null;
    threadId: string | null;
    /** Zamknięte sprawy (tryb listy w zakładce Sprawy). */
    archive: boolean;
    /**
     * Sprawy jako tablica (kanban); otwarta sprawa jest wtedy oknem nad tablicą.
     * Tablica jest domyślna (decyzja z 23.10.2026) - adres zapisuje tylko listę.
     */
    board: boolean;
    /** Odrzucone przez automat (tryb listy w zakładce Poczta). */
    rejected: boolean;
    /** Nowa wiadomość od zera; `to` - adres wpisany z góry. */
    compose: { to: string } | null;
}

export function useInboxNav(scope: InboxScope = 'cases') {
    const [params, setParams] = useSearchParams();

    const location: InboxLocation = useMemo(
        () => {
            const archive = params.get('archive') === '1';
            return {
                tab: inboxTabFromParam(scope, params.get('view')),
                leadId: params.get('lead'),
                threadId: params.get('thread'),
                archive,
                board: scope === 'cases' && !archive && params.get('layout') !== 'list',
                rejected: params.get('folder') === 'rejected',
                compose: params.get('compose') === '1' ? { to: params.get('to') ?? '' } : null,
            };
        },
        [params, scope]
    );

    const write = useCallback(
        (next: Partial<InboxLocation>) => {
            const merged = { ...location, ...next };
            const out: Record<string, string> = {};
            const view = inboxTabParam(merged.tab);
            if (view) out.view = view;
            if (merged.tab === 'sprawy') {
                if (merged.archive) out.archive = '1';
                else if (!merged.board) out.layout = 'list';
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
        /** Zmiana zakładki (Poczta ↔ Wysłane) zaczyna od czystej listy - otwarte rzeczy należą do poprzedniej. */
        setTab: (tab: InboxTab) => tab !== location.tab && write({ tab, leadId: null, threadId: null, archive: false, rejected: false, compose: null }),
        openCase: (leadId: string | null) => write({ leadId }),
        openThread: (threadId: string | null) => write({ threadId, compose: null }),
        /** Zamknięte sprawy to tryb listy - wyjście z nich wraca do listy, z której weszło. */
        setArchive: (archive: boolean) => write({ archive, board: false, leadId: null }),
        /** Lista ↔ tablica. Otwarta sprawa zostaje otwarta - w drugim układzie też ją widać. */
        setBoard: (board: boolean) => write({ board, archive: false }),
        setRejected: (rejected: boolean) => write({ rejected, threadId: null }),
        openCompose: (to = '') => write({ compose: { to }, threadId: null }),
        closeCompose: () => write({ compose: null }),
        /** Po wysłaniu nowej wiadomości: wątek w Wysłanych. */
        showSent: (threadId: string) => write({ tab: 'wyslane', threadId, compose: null, rejected: false }),
    };
}
