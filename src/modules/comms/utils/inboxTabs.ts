// src/modules/comms/utils/inboxTabs.ts
/**
 * Zakładki skrzynki. „Zapytania" (/inbox) to same sprawy, „Poczta" (/mail) ma dwie
 * zakładki: odebrane i wysłane - w panelu bocznym to osobne pozycje (decyzja
 * z 23.10.2026), więc zakładka spraw nie stoi już obok poczty.
 */
export type InboxTab = 'sprawy' | 'poczta' | 'wyslane';

/** Która część skrzynki: sprawy (/inbox) albo poczta (/mail). */
export type InboxScope = 'cases' | 'mail';

/** Zakładka z adresu: w Zapytaniach zawsze sprawy, w Poczcie `?view=sent` to Wysłane. */
export const inboxTabFromParam = (scope: InboxScope, value: string | null): InboxTab =>
    scope === 'cases' ? 'sprawy' : value === 'sent' ? 'wyslane' : 'poczta';

/** `?view=` dla zakładki; null - zakładka domyślna swojej części skrzynki. */
export const inboxTabParam = (tab: InboxTab): string | null => (tab === 'wyslane' ? 'sent' : null);
