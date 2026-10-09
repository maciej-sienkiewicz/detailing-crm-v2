// src/modules/comms/inbox/caseModel.ts
// Co skrzynka „Zapytania" mówi o sprawie - zdania, plakietki i krok następny.
//
// Czyste funkcje, bo te same zdania stoją w wierszu listy, w nagłówku rozmowy,
// w panelu sprawy i na telefonie. Policzone w czterech miejscach rozjechałyby się
// pierwszego dnia, w którym ktoś zmieni jeden warunek.
//
// Kwoty: brutto z serwera (`totalGross` pozycji, `estimatedValue` sprawy) bez
// przeliczania - CLAUDE.md §1. Formatowanie jedynie chowa zerowe grosze.
import type { ContactCard, Lead } from '../types';
import { CLOSED_STATUSES } from '../utils/leadFormat';
import { leadPhoneNumber } from '../utils/leadPrimaryAction';
import type { LeadUrgency } from '../utils/leadUrgency';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Wiek oczekiwania w wierszu: „5 min", „27 godz.", „3 dni". Do dwóch dób w godzinach -
 * „1 dzień" przy 27 i przy 47 godzinach to dwie różne zaległości pod jednym słowem.
 */
export function rowAge(elapsedMs: number): string {
    if (elapsedMs < MINUTE) return 'teraz';
    if (elapsedMs < HOUR) return `${Math.floor(elapsedMs / MINUTE)} min`;
    if (elapsedMs < 2 * DAY) return `${Math.floor(elapsedMs / HOUR)} godz.`;
    const days = Math.floor(elapsedMs / DAY);
    return days === 1 ? '1 dzień' : `${days} dni`;
}

const group = (value: number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Kwota z wyceny: „4 200 zł", a grosze tylko wtedy, gdy są - „1 899,99 zł".
 * Zaokrąglenie do złotówek ukryłoby grosz, który ktoś wpisał świadomie.
 */
export function formatAmount(grosze: number): string {
    const negative = grosze < 0;
    const abs = Math.abs(grosze);
    const zloty = Math.floor(abs / 100);
    const cents = abs % 100;
    const body = cents === 0 ? group(zloty) : `${group(zloty)},${String(cents).padStart(2, '0')}`;
    return `${negative ? '−' : ''}${body} zł`;
}

export const hasQuote = (lead: Pick<Lead, 'services'>): boolean =>
    lead.services.some((item) => item.status === 'ACCEPTED');

/** Odezwaliśmy się już do klienta (mailem albo odnotowanym telefonem). */
export const weReplied = (lead: Pick<Lead, 'lastOutboundAt' | 'firstResponseAt'>): boolean =>
    Boolean(lead.lastOutboundAt || lead.firstResponseAt);

/** Zdanie pod nazwą sprawy w liście. `hot` - klient odpisał: to warto zobaczyć pierwsze. */
export function caseSentence(lead: Lead, urgency: LeadUrgency): { text: string; hot: boolean } {
    if (CLOSED_STATUSES.has(lead.status)) return { text: lead.lostReasonLabel ?? 'Zamknięta', hot: false };
    if (urgency.owed) return { text: lead.owedNote ? `Obiecaliśmy: ${lead.owedNote}` : 'Obiecaliśmy odpowiedź', hot: true };
    if (urgency.turn === 'OURS') {
        if (!weReplied(lead)) return { text: 'Nowe zapytanie', hot: false };
        return { text: hasQuote(lead) ? 'Odpisał na wycenę' : 'Odpisał', hot: true };
    }
    if (lead.appointmentId) return { text: 'Termin w kalendarzu', hot: false };
    return { text: hasQuote(lead) ? 'Wycena wysłana' : 'Czekamy na klienta', hot: false };
}

/** Plakietka w nagłówku rozmowy. */
export function caseStatusChip(lead: Lead): { label: string; tone: 'accent' | 'neutral' | 'ok' } {
    if (lead.status === 'COMPLETED') return { label: 'Zrealizowana', tone: 'ok' };
    if (lead.status === 'LOST' || lead.status === 'NO_SHOW') return { label: 'Zamknięta', tone: 'neutral' };
    if (lead.appointmentId) return { label: 'Termin umówiony', tone: 'ok' };
    if (!weReplied(lead)) return { label: 'Nowe zapytanie', tone: 'neutral' };
    if (hasQuote(lead)) return { label: 'Wycena wysłana', tone: 'accent' };
    return { label: 'W kontakcie', tone: 'neutral' };
}

/** Nagłówek karty wyceny - czy klient już ją zna. */
export const quoteHeading = (lead: Lead): string =>
    weReplied(lead) ? 'Wycena' : 'Wycena, jeszcze nie wysłana';

export type CaseStepKind = 'REPLY' | 'BOOK' | 'CALL' | 'APPOINTMENT' | 'NONE';

export interface CaseStep {
    kind: CaseStepKind;
    title: string;
    /** Druga linia jedynego wypełnionego przycisku: co stanie się potem. */
    hint: string;
    href?: string;
}

/**
 * Krok następny sprawy - jeden.
 *
 * Inaczej niż w kolejce leadów: gdy klient odpisał na WYSŁANĄ wycenę, krokiem jest
 * umówienie wizyty, a nie kolejny mail. Tak klient pyta o termin („Czy da się
 * w przyszły wtorek?") i tak domyka się sprzedaż - potwierdzenie rezerwacji jest
 * odpowiedzią. Gdy to jest krok, „Wyślij" w kompozytorze traci wypełnienie
 * (CLAUDE.md §2), ale zostaje pod ręką.
 *
 * Podpis „potem otworzy się następna sprawa" wycofany: przejście do następnej sprawy
 * widać po fakcie, a zapowiedź tylko wydłużała przycisk.
 */
export function caseNextStep(lead: Lead, urgency: LeadUrgency): CaseStep {
    if (CLOSED_STATUSES.has(lead.status)) return { kind: 'NONE', title: '', hint: '' };
    if (lead.appointmentId) return { kind: 'APPOINTMENT', title: 'Zobacz termin', hint: 'Rezerwacja stoi w kalendarzu' };
    const phone = leadPhoneNumber(lead);
    if (!lead.threadId && phone && urgency.turn === 'OURS') {
        return { kind: 'CALL', title: 'Zadzwoń', hint: phone, href: `tel:${phone.replace(/\s/g, '')}` };
    }
    if (urgency.turn === 'OURS' && !(weReplied(lead) && hasQuote(lead))) {
        return { kind: 'REPLY', title: hasQuote(lead) ? 'Wyślij wycenę' : 'Wyślij', hint: '' };
    }
    return { kind: 'BOOK', title: 'Umów wizytę', hint: 'Klient dostanie potwierdzenie' };
}

/** Odmiana „wizyta / wizyty / wizyt". */
export function visitsWord(count: number): string {
    if (count === 1) return 'wizyta';
    const rest = count % 10;
    const teens = count % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? 'wizyty' : 'wizyt';
}

/** „Stały klient, 3 wizyty" albo „Nowy klient" - jedna linijka pod nazwiskiem. */
export function clientLine(card: ContactCard | null | undefined): string {
    const visits = card?.customer?.completedVisitCount ?? 0;
    if (visits > 0) return `Stały klient, ${visits} ${visitsWord(visits)}`;
    if (card?.customer) return 'Klient w kartotece';
    return 'Nowy klient';
}

/** Nazwa sprawy w liście: auto, a bez rozpoznanego auta - osoba. */
export const caseTitle = (lead: Lead): string =>
    lead.vehicleBrand
        ? `${lead.vehicleBrand}${lead.vehicleModel ? ` ${lead.vehicleModel}` : ''}`
        : lead.customerName?.trim() || lead.contactIdentifier;

/** Linia pod tytułem rozmowy: „Jan Kowalski, jan.k@wp.pl". */
export const caseSubtitle = (lead: Lead): string => {
    const name = lead.customerName?.trim();
    if (!lead.vehicleBrand) return name && name !== lead.contactIdentifier ? lead.contactIdentifier : '';
    return name ? `${name}, ${lead.contactIdentifier}` : lead.contactIdentifier;
};
