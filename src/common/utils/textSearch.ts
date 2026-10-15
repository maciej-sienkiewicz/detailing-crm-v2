/**
 * Dopasowanie frazy z pola „szukaj" do rekordu opisanego kilkoma polami — dla list
 * filtrowanych w przeglądarce. Te same reguły co `TextMatcher` w backendzie.
 *
 * Zgłoszenie z produkcji: na liście klientów „Andrzej" i „nowak" znajdowały klienta,
 * a „Andrzej Nowak" — nie, bo fraza była porównywana w całości z każdym polem osobno.
 * Dlatego:
 *
 * - każde słowo frazy musi trafić w któreś pole (kolejność słów dowolna),
 * - wielkość liter i polskie znaki nie mają znaczenia („lukasz" = „Łukasz"),
 * - pola numeryczne (telefon, tablica) porównywane są bez spacji i separatorów,
 *   a sąsiadujące fragmenty numeru we frazie są sklejane („600 100 200" to jeden numer).
 */

const MIN_DIGITS = 3;
const NUMBER_PART = /^[+(]?\d[\d\-()./]*$|^\+$/;

/** Małe litery, bez znaków diakrytycznych. `ł` nie rozkłada się w NFD, więc osobno. */
export const foldText = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/ł/g, 'l')
        .trim();

const digitsOf = (value: string): string => value.replace(/\D/g, '');

type Term = { kind: 'word'; text: string } | { kind: 'number'; raw: string; digits: string };

const toTerms = (query: string): Term[] => {
    const terms: Term[] = [];
    let rawNumber = '';
    const flush = () => {
        if (!rawNumber) return;
        terms.push({ kind: 'number', raw: rawNumber, digits: digitsOf(rawNumber) });
        rawNumber = '';
    };
    for (const token of foldText(query).split(/\s+/).filter(Boolean)) {
        if (NUMBER_PART.test(token)) {
            rawNumber += token;
        } else {
            flush();
            terms.push({ kind: 'word', text: token });
        }
    }
    flush();
    return terms;
};

/** Numer kierunkowy bywa zapisany po jednej stronie, a po drugiej nie (+48). */
const numberMatches = (stored: string, queryDigits: string): boolean =>
    stored.includes(queryDigits) ||
    (queryDigits.length === 11 && queryDigits.startsWith('48') && stored.includes(queryDigits.slice(2)));

type Field = string | null | undefined;

/**
 * @param query fraza z pola „szukaj"; pusta pasuje do wszystkiego
 * @param textFields pola porównywane jako tekst
 * @param numberFields pola porównywane po cyfrach (telefon, NIP)
 */
export const matchesSearch = (query: string | null | undefined, textFields: Field[], numberFields: Field[] = []): boolean => {
    const terms = toTerms(query ?? '');
    if (terms.length === 0) return true;

    const texts = textFields.filter((f): f is string => !!f && !!f.trim()).map(foldText);
    // Tablica „WA 12345" ma się znaleźć po „WA12345" - teksty porównujemy też bez spacji.
    const compactTexts = texts.map(t => t.replace(/[\s-]/g, ''));
    const numbers = numberFields.filter((f): f is string => !!f).map(digitsOf).filter(Boolean);

    return terms.every(term => {
        if (term.kind === 'word') {
            return texts.some(t => t.includes(term.text)) || compactTexts.some(t => t.includes(term.text));
        }
        if (!term.digits) return true;
        return (term.digits.length >= MIN_DIGITS && numbers.some(n => numberMatches(n, term.digits)))
            || texts.some(t => t.includes(term.raw))
            || compactTexts.some(t => t.includes(term.digits));
    });
};
