/**
 * Progi układu listy operacji — liczone od szerokości SAMEJ LISTY, nie okna.
 *
 * Dlaczego to w ogóle istnieje: lista stoi w karcie, karta w kolumnie treści,
 * a kolumna obok paska bocznego. Przy oknie 1100 px i rozwiniętym pasku lista
 * dostaje realnie ~790 px. Zapytanie `@media (max-width: 900px)` widzi jednak
 * OKNO, więc przy 1100 px zostawiało pełną tabelę: sześć kolumn o stałych
 * szerokościach nie mieściło się w 790 px, kolumna tytułu kurczyła się do
 * kilkudziesięciu pikseli i cały wiersz zjeżdżał w jedną pionową kolumnę.
 *
 * Odpowiedzią są zapytania kontenerowe. Nazwa kontenera i próg żyją TUTAJ,
 * a nie w dwóch plikach osobno, bo pasek filtrów i tabela stoją w tej samej
 * karcie i muszą przełączać się w tym samym momencie — inaczej przy pewnych
 * szerokościach pasek jest już „mobilny", a tabela jeszcze nie.
 */

/** Nazwa kontenera, względem którego mierzą się oba panele karty. */
export const OPS_LIST_CONTAINER = 'ops-list';

/**
 * Poniżej tej szerokości wiersz przestaje być wierszem tabeli i staje się kafelką.
 *
 * Wartość nie jest okrągła z przypadku: to minimum, przy którym tabela jeszcze
 * się mieści — kolumny w swoich najwęższych wariantach (200 + 112 + 112 + 104 +
 * 96 + 44), pięć odstępów po 12 px i 2 × 20 px paddingu wiersza dają 768 px.
 * Kilkanaście pikseli zapasu trzyma nas z dala od granicy przepełnienia.
 */
export const OPS_CARDS_BELOW = 780;

/** Zapytanie kontenerowe dla układu kafelkowego (i jego odwrotność). */
export const opsCards = `@container ${OPS_LIST_CONTAINER} (max-width: ${OPS_CARDS_BELOW - 1}px)`;
export const opsTable = `@container ${OPS_LIST_CONTAINER} (min-width: ${OPS_CARDS_BELOW}px)`;

/**
 * Czy przy tej szerokości rysujemy kafelki. Ten sam próg co w CSS — stąd bierze
 * go logika, która nie da się wyrazić stylem (kafelka jest JEDNYM celem dotyku,
 * więc odnośniki w jej środku muszą zniknąć).
 *
 * Przed pierwszym pomiarem (`null`) odpowiadamy „nie": tabela jest stanem
 * domyślnym, a odnośniki w wierszu są wtedy na swoim miejscu.
 */
export const isOpsCardLayout = (containerWidth: number | null): boolean =>
    containerWidth !== null && containerWidth < OPS_CARDS_BELOW;
