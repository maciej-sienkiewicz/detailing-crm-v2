// Nazwa nadawcy SMS: co przyjmie operator.

const POLISH_TO_ASCII: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
};

/**
 * Operator przyjmuje tylko litery bez ogonków, cyfry, spację, kropkę i myślnik.
 * Wielkość liter jest wyborem studia - „DetailBoost" to nie to samo co „DETAILBOOST",
 * a wcześniej pole na siłę podnosiło wszystko do wersalików.
 *
 * Polska litera zamienia się na swoją bez ogonka, zamiast znikać: „Błysk" wycinane do
 * „Bysk" dawało po cichu literówkę w nazwie, którą klient widzi przy każdym SMS-ie.
 */
export const sanitizeSenderName = (value: string) =>
    value
        .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => POLISH_TO_ASCII[ch] ?? ch)
        .replace(/[^A-Za-z0-9 .-]/g, '');
