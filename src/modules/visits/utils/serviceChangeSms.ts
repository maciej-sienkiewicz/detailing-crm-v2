// src/modules/visits/utils/serviceChangeSms.ts
//
// Treść SMS-a o zmianach w zakresie usług budujemy z danych, które CRM już ma -
// bez odpytywania serwera i bez modelu językowego: nazwy usług i cena końcowa
// wystarczą, a użytkownik i tak może wiadomość dowolnie poprawić.

/** Fraza doklejana przez backend na końcu każdej takiej wiadomości. */
export const CONSENT_CALL_TO_ACTION = 'Odpisz TAK aby zaakceptować.';

const POLISH_TO_ASCII: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
};

const POLISH_CHARS_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/** Czy tekst zawiera znaki, które wypychają SMS-a do kodowania UCS-2. */
export const hasPolishCharacters = (text: string): boolean => POLISH_CHARS_RE.test(text);

/** Zamiana polskich znaków na ASCII - tańszy SMS (160 znaków na segment zamiast 70). */
export const toAscii = (text: string): string =>
    text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => POLISH_TO_ASCII[ch] ?? ch);

/**
 * Kwota w formacie SMS-owym: "2 830,18 zł".
 * Świadomie nie używamy Intl - wstawia twardą spację (U+00A0), której nie ma
 * w alfabecie GSM-7, przez co cała wiadomość poszłaby drożej.
 */
export const formatSmsAmount = (cents: number): string => {
    const [whole, fraction] = (cents / 100).toFixed(2).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${grouped},${fraction} zł`;
};

export interface ServiceChangeSummary {
    addedNames: string[];
    removedNames: string[];
    priceChangedNames: string[];
    /** Cena końcowa brutto po zmianach, w groszach. */
    totalGrossAfter: number;
}

/** Skleja do [maxItems] nazw, resztę zwija do "i inne". */
const shortList = (names: string[], maxItems = 3): string =>
    names.length <= maxItems
        ? names.join(', ')
        : `${names.slice(0, maxItems).join(', ')} i inne`;

/**
 * Buduje treść wiadomości (bez frazy o odpowiedzi - tę dokleja backend przy wysyłce).
 *
 * Przykład: "Dodano: Pranie tapicerki. Usunięto: Naprawa wgniecenia.
 *            Zmieniono cenę: Polerowanie. Razem 2 830,18 zł."
 */
export const buildServiceChangeSmsMessage = (summary: ServiceChangeSummary): string => {
    const parts: string[] = [];

    if (summary.addedNames.length > 0) parts.push(`Dodano: ${shortList(summary.addedNames)}.`);
    if (summary.removedNames.length > 0) parts.push(`Usunięto: ${shortList(summary.removedNames)}.`);
    if (summary.priceChangedNames.length > 0) parts.push(`Zmieniono cenę: ${shortList(summary.priceChangedNames)}.`);

    parts.push(`Razem ${formatSmsAmount(summary.totalGrossAfter)}.`);

    return parts.join(' ');
};
