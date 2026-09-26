/**
 * Nagłówek menu pokazuje nazwę firmy z `GET /api/v1/company`. Nazwy w rejestrze
 * bywają pełnymi nazwami prawnymi („CARSLAB SPÓŁKA Z OGRANICZONĄ
 * ODPOWIEDZIALNOŚCIĄ”), więc inicjały w kafelku liczymy z członu właściwego -
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
 * nazwie jednowyrazowej - jej dwie pierwsze litery. Zawsze 1-2 znaki.
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

/**
 * Forma prawna na końcu nazwy: „sp. z o.o.", „Spółka z ograniczoną odpowiedzialnością",
 * „S.A.", „sp.j.", „sp.k.", „s.c." i ich pełne brzmienia. Wielkość liter bez znaczenia —
 * nazwy z rejestru przychodzą wersalikami.
 */
const LEGAL_FORM_TAIL = new RegExp(
    '[\\s,]+(' + [
        'sp(ółka|olka)?\\.?\\s*z\\s*o\\.?\\s*o\\.?',
        'sp(ółka|olka)\\s+z\\s+ograniczon(ą|a)\\s+odpowiedzialno(ś|s)ci(ą|a)',
        's\\.?\\s?a\\.?',
        'sp(ółka|olka)\\s+akcyjna',
        'sp\\.?\\s?j\\.?',
        'sp(ółka|olka)\\s+jawna',
        'sp\\.?\\s?k\\.?',
        'sp(ółka|olka)\\s+komandytowa',
        's\\.?\\s?c\\.?',
        'sp(ółka|olka)\\s+cywilna',
    ].join('|') + ')\\s*$',
    'iu',
);

/**
 * Nazwa do nagłówka menu: bez formy prawnej. „Detailing Studio sp. z o.o." łamało się
 * w wąskim pasku na „Detailing Studio sp." i osierocone „z o.o." w drugiej linii,
 * a sama forma prawna nikomu nic w tym miejscu nie mówi. Pełna nazwa zostaje
 * w podpowiedzi. Gdy poza formą nic nie zostaje, oddajemy nazwę bez zmian.
 */
export const companyDisplayName = (name: string): string => {
    const trimmed = name.trim();
    const short = trimmed.replace(LEGAL_FORM_TAIL, '').trim() || trimmed;
    return isShouted(short) ? sentenceCaseWords(short) : short;
};

/** Nazwa bez żadnej małej litery: tak przychodzą nazwy z CEIDG i KRS. */
const isShouted = (name: string): boolean =>
    /\p{Lu}.*\p{Lu}/u.test(name) && !/\p{Ll}/u.test(name);

const VOWELS = /[aeiouyąęó]/iu;
const LOWERCASE_JOINERS = new Set(['i', 'oraz', 'w', 'z', 'na', 'do', 'dla', 'od']);

/**
 * „LEATHER MASTER HUBERT NOWAK" → „Leather Master Hubert Nowak". Wersaliki z rejestru
 * w nagłówku menu wyglądały jak wydruk z urzędu, a nie jak znak firmy, i zajmowały
 * o jedną trzecią więcej miejsca. Skrót bez samogłosek (BMW, PPF) zostaje wersalikami,
 * spójnik w środku nazwy idzie małą literą.
 */
const sentenceCaseWords = (name: string): string =>
    name.split(/(\s+)/).map((word, index) => {
        if (/^\s+$/.test(word) || word.length === 0) return word;
        const lower = word.toLocaleLowerCase('pl');
        if (index > 0 && LOWERCASE_JOINERS.has(lower)) return lower;
        if (word.length <= 4 && !VOWELS.test(word)) return word;
        return lower.charAt(0).toLocaleUpperCase('pl') + lower.slice(1);
    }).join('');
