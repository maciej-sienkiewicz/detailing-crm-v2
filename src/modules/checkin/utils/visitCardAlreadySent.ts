import type { VisitCardLinkResponse } from '@/modules/visit-card/types';

export interface VisitCardAlreadySent {
    /** ISO timestamp of the most recent delivery on any channel. */
    sentAt: string;
    /** Human sentence for the notice under the switch. */
    text: string;
}

const fmt = (iso: string) =>
    new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Karta Rezerwacji i Karta Wizyty to jeden link. Jeśli poszedł już przy rezerwacji,
 * przy przyjęciu auta mówimy o tym wprost i sugerujemy niewysyłanie go drugi raz —
 * ale decyzja zostaje po stronie operatora, więc to jest tylko informacja.
 */
export function describeVisitCardAlreadySent(link: VisitCardLinkResponse | null | undefined): VisitCardAlreadySent | null {
    if (!link) return null;
    const channels: { at: string; label: string }[] = [];
    if (link.lastSmsSentAt) channels.push({ at: link.lastSmsSentAt, label: 'SMS-em' });
    if (link.lastEmailSentAt) channels.push({ at: link.lastEmailSentAt, label: 'e-mailem' });
    if (channels.length === 0) return null;
    channels.sort((a, b) => (a.at < b.at ? 1 : -1));
    const latest = channels[0];
    const how = channels.map(c => `${c.label} ${fmt(c.at)}`).join(' oraz ');
    return {
        sentAt: latest.at,
        text: `Klient dostał już ten link ${how} jako Kartę Rezerwacji. To ta sama karta, więc drugiej wysyłki zwykle nie trzeba.`,
    };
}
