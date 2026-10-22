// src/modules/comms/utils/inboxTabs.ts
/** Zakładki skrzynki „Zapytania" - patrz InboxNav. */
export type InboxTab = 'sprawy' | 'poczta' | 'wyslane';

/** Wartość `?view=` w adresie; Sprawy są domyślne i nie zostawiają śladu w adresie. */
const TAB_PARAM: Record<InboxTab, string | null> = { sprawy: null, poczta: 'mail', wyslane: 'sent' };

export const inboxTabFromParam = (value: string | null): InboxTab =>
    value === 'mail' ? 'poczta' : value === 'sent' ? 'wyslane' : 'sprawy';

/** `?view=` dla zakładki; null - zakładka domyślna. */
export const inboxTabParam = (tab: InboxTab): string | null => TAB_PARAM[tab];
