// src/modules/comms/utils/inboxTabs.ts
/** Zakładki skrzynki „Zapytania" - patrz InboxNav. */
export type InboxTab = 'sprawy' | 'poczta' | 'wyslane';

/** Wartość `?view=` w adresie; Sprawy są domyślne i nie zostawiają śladu w adresie. */
export const inboxTabFromParam = (value: string | null): InboxTab =>
    value === 'poczta' ? 'poczta' : value === 'wyslane' ? 'wyslane' : 'sprawy';
