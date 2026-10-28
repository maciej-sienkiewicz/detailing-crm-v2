// src/modules/comms/utils/preparedReply.ts
// Odpowiedź przygotowana zaraz po przyjściu zapytania (serwer: LeadReplyDraftPreparer).
// Osobno od edytora, żeby dało się ją testować.
import { pluralPl } from '@/common/utils/plural';
import type { CalendarDayLoad, PreparedReply, ReplyDraft, ReplyKind } from '../types';

export const REPLY_KIND_LABELS: Record<ReplyKind, string> = {
    QUOTE: 'Wycena',
    PHOTOS: 'Prośba o zdjęcia',
    INSPECTION: 'Zaproszenie na oględziny',
};

const PLACEHOLDER = /\[[^\]\n]{1,80}\]/g;

/**
 * Treść szkicu pod stopkę, z którą ten pracownik odpowiada; null - szkicu nie da się użyć.
 *
 * Szkic z tła pisze serwer, zanim wiadomo, KTO odpisze, więc zawsze zakłada stopkę:
 * kończy się samym „Pozdrawiam", bez imienia. Dawniej edytor wymagał tej samej stopki
 * i przy jakiejkolwiek różnicy szkic po cichu znikał - a w studiu z sześcioma osobami
 * stopkę miała jedna, więc pierwszego zapytania po wdrożeniu (28.10.2026) nikt nie
 * zobaczył z gotową odpowiedzią. Bez stopki dopisujemy imię pod pożegnaniem, tak jak
 * zrobiłby to asystent. W drugą stronę (szkic podpisany imieniem, a edytor doda stopkę)
 * nie zgadujemy, co wyciąć - wtedy null i szkic piszemy od nowa.
 */
export function preparedTextFor(
    bodyText: string,
    writtenWithSignature: boolean,
    appendSignature: boolean,
    senderFirstName?: string | null,
): string | null {
    if (writtenWithSignature === appendSignature) return bodyText;
    if (!writtenWithSignature) return null;
    const name = senderFirstName?.trim();
    return name ? `${bodyText.trimEnd()}\n${name}` : bodyText;
}

/**
 * Szkic przygotowany w tle w kształcie szkicu z przycisku - ten sam edytor, te same
 * blokady: niewypełniony „[proponowany termin]" wstrzymuje wysyłkę. [bodyText] - treść
 * już dopasowana do stopki ([preparedTextFor]).
 */
export const toReplyDraft = (prepared: PreparedReply, bodyText: string = prepared.bodyText): ReplyDraft => ({
    bodyText,
    useSentStyle: prepared.useSentStyle,
    styleApplied: false,
    examples: [],
    placeholders: Array.from(new Set(bodyText.match(PLACEHOLDER) ?? [])),
    unverifiedAmounts: [],
    notice: 'Odpowiedź przygotowana zaraz po przyjściu zapytania. Przeczytaj ją przed wysłaniem.',
    offerIncluded: prepared.kind === 'QUOTE',
    offer: prepared.offer.map((line) => ({ name: line.name, quantity: line.quantity, priceGross: line.priceGross })),
});

/**
 * „1 000,00 zł" - kwota z oferty szkicu, co do grosza i zapisana tak jak w treści maila.
 * Grupowanie ręcznie: polskie Intl nie dzieli czterocyfrowych kwot („1000,00"), a mail
 * od serwera dzieli - karta i mail pokazywałyby tę samą kwotę dwoma zapisami.
 */
const formatGross = (grosze: number): string => {
    const zloty = Math.floor(grosze / 100);
    const cents = String(grosze % 100).padStart(2, '0');
    return `${String(zloty).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')},${cents}\u00a0zł`;
};

const KIND_IN_TITLE: Record<ReplyKind, string> = {
    QUOTE: 'wycena',
    PHOTOS: 'prośba o zdjęcia',
    INSPECTION: 'zaproszenie na oględziny',
};

/** „Gotowa odpowiedź: wycena na 990,00 zł" - nagłówek karty pod rozmową. */
export const preparedReplyTitle = (prepared: PreparedReply): string => {
    const total = offerTotal(prepared);
    const what = prepared.kind === 'QUOTE' && total > 0
        ? `wycena na ${formatGross(total)}`
        : KIND_IN_TITLE[prepared.kind];
    return `Gotowa odpowiedź: ${what}`;
};

const GREETING = /^(witam|dzień dobry|dobry wieczór|szanown|cześć|hej)/i;

/**
 * Pierwszy akapit treści po powitaniu - podgląd w karcie. „Witam," nie mówi nic o tym,
 * co jest w odpowiedzi, a w dwóch linijkach podglądu zajęłoby całą pierwszą.
 */
export const preparedReplyPreview = (text: string): string => {
    const paragraphs = text.split(/\n\s*\n/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const body = paragraphs.length > 1 && GREETING.test(paragraphs[0]) && paragraphs[0].length <= 40
        ? paragraphs.slice(1)
        : paragraphs;
    return body[0] ?? '';
};

/** Próg, od którego po wysłaniu wyceny warto zadzwonić - 10 000 zł brutto. */
export const BIG_QUOTE_GROSS = 1_000_000;

/** Suma oferty w szkicu, grosze brutto - te same kwoty, które stoją na leadzie (CLAUDE.md §1). */
export const offerTotal = (prepared: PreparedReply): number =>
    prepared.offer.reduce((sum, line) => sum + line.priceGross * line.quantity, 0);

/** „17 000 zł" - pełne złote, jak kwoty w podsumowaniach. */
const formatZloty = (grosze: number): string =>
    `${Math.round(grosze / 100).toLocaleString('pl-PL').replace(/\u00a0/g, ' ')} zł`;

/**
 * Zdanie pod przygotowaną odpowiedzią, gdy mail to za mało: stały klient albo wycena
 * od 10 000 zł. Studio z folią (październik 2026): stały klient z nowym BMW M3 czekał
 * 12 dni bez odpowiedzi, a 6 dużych wycen to 78% wartości wszystkich.
 */
export const preparedReplyHint = (prepared: PreparedReply | null, completedVisits: number): string | null => {
    if (!prepared) return null;
    if (completedVisits > 0) {
        return `Stały klient (${completedVisits} ${pluralPl(completedVisits, 'wizyta', 'wizyty', 'wizyt')}). Po wysłaniu warto zadzwonić.`;
    }
    const total = offerTotal(prepared);
    if (prepared.kind === 'QUOTE' && total >= BIG_QUOTE_GROSS) {
        return `Wycena na ${formatZloty(total)}. Przy takiej kwocie po wysłaniu warto zadzwonić.`;
    }
    return null;
};

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const WEEKDAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sb'];

const parseDay = (iso: string): Date => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const dayMonth = (date: Date): string =>
    `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

/** „czw 30.10" na przycisku podpowiedzi. */
export const calendarDayShort = (day: CalendarDayLoad): string => {
    const date = parseDay(day.date);
    return `${WEEKDAYS_SHORT[date.getDay()]} ${dayMonth(date)}`;
};

/** „2 rezerwacje", „bez rezerwacji" - obciążenie dnia, bez oceniania, czy to dużo. */
export const calendarDayLoad = (day: CalendarDayLoad): string =>
    day.bookings === 0
        ? 'bez rezerwacji'
        : `${day.bookings} ${pluralPl(day.bookings, 'rezerwacja', 'rezerwacje', 'rezerwacji')}`;

/** „czwartek 30.10" - tak, jak dzień trafia do maila. */
export const calendarDayInText = (day: CalendarDayLoad): string => {
    const date = parseDay(day.date);
    return `${WEEKDAYS[date.getDay()]} ${dayMonth(date)}`;
};

/** Pierwszy znacznik terminu w treści („[proponowany termin]", „[termin]"); null, gdy go nie ma. */
export const datePlaceholder = (text: string): string | null =>
    (text.match(PLACEHOLDER) ?? []).find((placeholder) => /termin|dzień|data/i.test(placeholder)) ?? null;

/** Wpisuje dzień w miejsce znacznika terminu; null, gdy w treści nie ma znacznika. */
export const fillDatePlaceholder = (text: string, day: CalendarDayLoad): string | null => {
    const placeholder = datePlaceholder(text);
    return placeholder ? text.replace(placeholder, calendarDayInText(day)) : null;
};
