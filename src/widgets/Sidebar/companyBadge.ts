/**
 * Nagłówek menu pokazuje nazwę firmy z `GET /api/v1/company`. Nazwy w rejestrze
 * bywają pełnymi nazwami prawnymi („CARSLAB SPÓŁKA Z OGRANICZONĄ
 * ODPOWIEDZIALNOŚCIĄ”), więc inicjały w kafelku liczymy z członu właściwego —
 * forma prawna jest taka sama u wszystkich i nic nie odróżnia.
 */

/** Człony formy prawnej i spójniki, które nie niosą nazwy. */
const LEGAL_FORM_WORDS = new Set([
    'sp', 'spolka', 'spółka', 'z', 'o', 'oo', 'ograniczona', 'ograniczoną',
    'odpowiedzialnoscia', 'odpowiedzialnością', 'sa', 'akcyjna', 'jawna',
    'komandytowa', 'komandytowo', 'partnerska', 'cywilna', 'i', 'oraz',
    'firma', 'przedsiebiorstwo', 'przedsiębiorstwo',
]);

const normalize = (word: string) => word.replace(/[.,]/g, '').toLowerCase();

const meaningfulWords = (name: string): string[] =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .filter(word => !LEGAL_FORM_WORDS.has(normalize(word)));

/**
 * Inicjały do kafelka: pierwsze litery dwóch pierwszych znaczących słów, a przy
 * nazwie jednowyrazowej — jej dwie pierwsze litery. Zawsze 1-2 znaki.
 */
export const companyInitials = (name: string | null | undefined, fallback = 'AC'): string => {
    const words = meaningfulWords((name ?? '').trim());
    if (words.length === 0) return fallback;
    if (words.length === 1) {
        return [...words[0]].filter(char => /\p{L}|\p{N}/u.test(char)).slice(0, 2).join('').toUpperCase()
            || fallback;
    }
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};
