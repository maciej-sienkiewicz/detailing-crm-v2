// Formatowanie i filtrowanie list widoku „Zaplanowana komunikacja" - SMS-ów i e-maili.

import type { AxiosError } from 'axios';
import { pluralPl } from '@/common/utils/plural';
import type { MessageChannel, ScheduledItem, ScheduledSmsSource } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** „14:05" */
export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** „14.10.2026" */
export const formatDay = (iso: string): string => {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** „14.10.2026, 10:00" */
export const formatWhen = (iso: string): string => `${formatDay(iso)}, ${formatTime(iso)}`;

/**
 * Dzień wysyłki w kolumnie „Wysyłka": „Dziś" i „Jutro" czyta się szybciej niż datę,
 * a to właśnie te dwa dni są powodem, dla którego się tu zagląda. W bieżącym roku
 * data bez roku („14.10") - na telefonie pełna data z godziną zabierała pół linii
 * odbiorcy; pełny termin jest w podpowiedzi.
 */
export const sendDayLabel = (iso: string, now: Date = new Date()): string => {
    const d = new Date(iso);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dayKey(d) === dayKey(now)) return 'Dziś';
    if (dayKey(d) === dayKey(tomorrow)) return 'Jutro';
    if (dayKey(new Date(d.getTime() + 86_400_000)) === dayKey(now)) return 'Wczoraj';
    return d.getFullYear() === now.getFullYear() ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}` : formatDay(iso);
};


/** Pola, po których szuka się na listach - zaplanowanych i wysłanych, SMS-ów i e-maili. */
interface Searchable {
    customerName: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    subject?: string | null;
    messageContent: string | null;
    kindLabel: string;
    campaign: { name: string } | null;
}

/** Numer SMS-a albo adres e-maila - to, na co wiadomość wyjdzie. */
export const contactOf = (item: Pick<Searchable, 'phoneNumber' | 'emailAddress'>): string | null =>
    item.phoneNumber ?? item.emailAddress ?? null;

/** Szukanie po kliencie, numerze, adresie, temacie, treści i nazwie kampanii - bez rozróżniania wielkości liter. */
export const matchesSearch = (item: Searchable, query: string): boolean => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const digits = q.replace(/\D/g, '');
    return [item.customerName, item.subject, item.messageContent, item.campaign?.name, item.kindLabel, item.emailAddress]
        .some(v => v?.toLowerCase().includes(q))
        || (digits.length >= 3 && !!item.phoneNumber?.replace(/\D/g, '').includes(digits));
};

/** SMS automatu: bez wiersza, liczony z reguł - zmiana dotyczy tylko tego jednego SMS-a. */
export const isAutomation = (source: ScheduledSmsSource): boolean =>
    source === 'PRE_VISIT' || source === 'POST_VISIT' || source === 'DELAYED_REMINDER';

/** Limit znaków taki jak na serwerze: przypomnienie przy wizycie ma własny, krótki. */
export const contentLimit = (source: ScheduledSmsSource): number => source === 'VISIT_REMINDER' ? 160 : 1000;

/** Kto dostanie wiadomość - nazwa klienta, a gdy jej nie ma, numer albo adres. */
export const recipientLabel = (item: ScheduledItem): string =>
    item.campaign?.name ?? item.customerName ?? contactOf(item) ?? 'Brak danych klienta';

/** „124 SMS-y czekają", „3 e-maile czekają", „Odbiorcy w dniu wysyłki". */
export const campaignCountLabel = (pendingCount: number | null, channel: MessageChannel = 'SMS'): string => {
    if (pendingCount === null) return 'Odbiorcy w dniu wysyłki';
    return channel === 'EMAIL'
        ? `${pendingCount} ${pluralPl(pendingCount, 'e-mail czeka', 'e-maile czekają', 'e-maili czeka')}`
        : `${pendingCount} ${pluralPl(pendingCount, 'SMS czeka', 'SMS-y czekają', 'SMS-ów czeka')}`;
};

/** „87 SMS-ów wysłanych", „2 e-maile wysłane" - wiersz kampanii w historii. */
export const campaignSentLabel = (sentCount: number, channel: MessageChannel = 'SMS'): string =>
    channel === 'EMAIL'
        ? `${sentCount} ${pluralPl(sentCount, 'e-mail wysłany', 'e-maile wysłane', 'e-maili wysłanych')}`
        : `${sentCount} ${pluralPl(sentCount, 'SMS wysłany', 'SMS-y wysłane', 'SMS-ów wysłanych')}`;

/** Komunikat serwera z odpowiedzi błędu; serwer pisze je po polsku i dla ludzi. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const message = (error as AxiosError<{ message?: string }>)?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
};
