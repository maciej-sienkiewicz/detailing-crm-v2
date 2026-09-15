import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Wspólna gramatyka wiersza dla obu tabel zakładki Reklamy.
 *
 * „Podsumowanie roku" i „Reklamodawcy w okolicy" pokazują tę samą strukturę —
 * nazwa, identyfikator, ile teraz, jak dużo, akcje — a robiły to dwoma różnymi
 * językami wizualnymi: pierwsza tabelą z liczbami do prawej, druga parami
 * etykieta/wartość powtarzanymi w każdym wierszu. Stojąc obok siebie czytały się
 * jak dwa różne produkty i to była główna przyczyna, dla której ekran męczył.
 *
 * Ten moduł jest jedynym miejscem, w którym wolno zdefiniować wysokość wiersza,
 * skalę pisma i wygląd akcji. Panele różnią się liczbą kolumn — i tylko tym.
 *
 * Reguły, które trzymają ekran w ryzach:
 *
 *   • ODSTĘPY tylko z siatki 4 / 8 / 12 / 16 / 20 / 24. Wcześniej w dwóch
 *     sąsiednich panelach żyły 22 różne wartości, w tym 13, 11, 9 i 3 px.
 *   • PISMO to cztery stopnie, nie osiem. Hierarchię w karcie szerokiej na
 *     420 px niesie waga i pozycja, nie rozmiar.
 *   • KOLOR ma znaczyć. Zieleń wyłącznie „emituje teraz", bursztyn wyłącznie
 *     „wymaga Twojej reakcji", błękit wyłącznie interakcja.
 */

/**
 * Stała wysokość wiersza: 20 px nazwa + 16 px metadana + 2 × 10 px luzu.
 *
 * Drugi rząd jest zarezerwowany ZAWSZE, także gdy nie ma czego w nim pokazać.
 * Wiersz zmieniający wysokość razem z treścią kosztuje oko mikro-korektę przy
 * każdym przewinięciu — zmierzone wysokości wahały się od 47 do 62 px w jednej
 * tabeli. Pusty rząd kosztuje 16 px i jest tego wart.
 */
export const ROW_HEIGHT = 56;

/**
 * Tekst drugorzędny.
 *
 * NIE `st.textMuted` (#94A3B8): na białym tle daje kontrast 2,56:1, a na
 * `bgCardAlt` 2,34:1 — obie wartości łamią WCAG AA (wymagane 4,5:1). Były nim
 * napisane wszystkie etykiety, nagłówki kolumn i uchwyty @profil, czyli
 * dokładnie ten drobny tekst, przy którym oko najbardziej się wysila.
 * `#475569` daje 7,58:1.
 */
export const INK_MUTED = st.textSecondary;

/** Zieleń „emituje teraz" — jedyne dopuszczone użycie koloru w wierszu. */
export const INK_LIVE = '#047857';

/**
 * `table-layout: fixed` to nie optymalizacja, tylko granica: bez niego tabela
 * rośnie do szerokości swojej treści i wychodzi poza kartę, niezależnie od
 * `width: 100%`. Z nim kolumny trzymają zadane szerokości, a za długa nazwa
 * przycina się wielokropkiem zamiast rozpychać układ.
 */
export const Table = styled.table`
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
`;

export const Th = styled.th<{ $num?: boolean }>`
    height: 32px;
    padding: 0 8px;
    text-align: ${p => (p.$num ? 'right' : 'left')};
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${INK_MUTED};
    white-space: nowrap;
    border-bottom: 1px solid ${st.border};

    &:first-child { padding-left: 0; }
    &:last-child { padding-right: 0; }
`;

/**
 * Wiersz bez linii pod spodem i BEZ przejścia na tle.
 *
 * Linie: dziesięć poziomych kresek na panel to dziesięć krawędzi, których oko
 * nie potrzebuje — stały rytm 56 px i wyrównane kolumny robią to samo ciszej.
 * Zostają dwie linie na panel: pod nagłówkiem i nad stronicowaniem.
 *
 * Przejście: animowane rozjaśnienie tła sprawia, że przy szybkim przesunięciu
 * myszy świecą trzy wiersze naraz. To jest „migotanie", na które ludzie się
 * skarżą, a nie podświetlenie.
 */
export const Row = styled.tr`
    &:hover > td { background: ${st.bg}; }
`;

export const Td = styled.td<{ $num?: boolean }>`
    height: ${ROW_HEIGHT}px;
    padding: 0 8px;
    text-align: ${p => (p.$num ? 'right' : 'left')};
    vertical-align: middle;
    font-size: 15px;
    font-weight: ${p => (p.$num ? 600 : 400)};
    color: ${st.text};
    font-variant-numeric: tabular-nums;

    &:first-child { padding-left: 0; }
    &:last-child { padding-right: 0; }
`;

/**
 * Komórka nazwy: dwa rzędy o stałej wysokości, zawsze oba.
 *
 * `$bar` rysuje 3 × 20 px pasek tożsamości przy lewej krawędzi. Zastępuje kropkę
 * 10 px, bo w kalendarzu nad tabelą kampanie są PASKAMI — to samo znaczenie
 * miało dotąd dwa różne kształty. Pasek wychodzi też poza pole widzenia
 * centralnego, więc nie konkuruje z nazwą o pierwsze spojrzenie.
 */
export const NameCell = styled.div<{ $bar?: string }>`
    position: relative;
    display: grid;
    grid-template-rows: 20px 16px;
    align-content: center;
    min-width: 0;
    padding-left: ${p => (p.$bar ? '12px' : '0')};

    ${p =>
        p.$bar &&
        `&::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            border-radius: 2px;
            background: ${p.$bar};
        }`}
`;

export const NameText = styled.span`
    font-size: 15px;
    font-weight: 500;
    line-height: 20px;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const MetaText = styled.span`
    font-size: 12px;
    line-height: 16px;
    color: ${INK_MUTED};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const MetaLink = styled.a`
    font-size: 12px;
    line-height: 16px;
    color: ${INK_MUTED};
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover { color: ${st.accentBlue}; text-decoration: underline; }
`;

/** Metadana wymagająca reakcji — jedyne użycie bursztynu w wierszu. */
export const MetaWarn = styled.span`
    font-size: 12px;
    line-height: 16px;
    color: #92400E;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/**
 * Liczba „ile emituje teraz".
 *
 * Zieleń niesie tu stan, nie dekorację — dlatego zastępuje pigułki „TRWA n",
 * które były zielonym tłem wokół liczby i czytały się jak odznaka sukcesu
 * przypięta konkurentowi. Zero jest ciche.
 */
export const NumLive = styled.span<{ $on: boolean }>`
    color: ${p => (p.$on ? INK_LIVE : INK_MUTED)};
    font-weight: ${p => (p.$on ? 700 : 400)};
`;

/** Brak pomiaru albo zero — zawsze ciszej niż wartość. */
export const NumQuiet = styled.span`
    color: ${INK_MUTED};
    font-weight: 400;
`;

/**
 * Jeden język akcji dla całej zakładki.
 *
 * Wcześniej w jednej komórce spotykały się trzy afordancje: zielona pigułka,
 * podkreślony link „strona FB" i ten sam link nazwany inaczej („sprawdź stronę
 * FB"), a w drugim panelu przygaszone ikony. Dwa różne napisy na ten sam cel
 * każą CZYTAĆ zamiast rozpoznawać.
 *
 * Widoczne 28 px, dotykowe 44 px przez `::after` — właściciel studia klika to
 * w warsztacie, często w rękawicach. Bez `opacity`: przygaszona ikona schodzi
 * poniżej kontrastu 3:1 wymaganego dla elementów sterujących (WCAG 1.4.11),
 * a przygaszanie i tak było zgadywanką „czy to jest klikalne".
 */
const actionBase = `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: ${st.radiusSm};
    background: none;
    color: ${st.textSecondary};
    cursor: pointer;
    text-decoration: none;

    svg { width: 15px; height: 15px; }

    /* Cel dotykowy 44 × 44 bez rozpychania wiersza. */
    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        transform: translate(-50%, -50%);
    }

    &:hover {
        border-color: ${st.border};
        background: ${st.bgCardAlt};
        color: ${st.text};
    }

    &:focus-visible {
        outline: 2px solid ${st.accentBlue};
        outline-offset: 1px;
    }

    &:disabled {
        cursor: default;
        opacity: 0.4;
    }
`;

export const IconBtn = styled.button`
    ${actionBase}
`;

export const IconLink = styled.a`
    ${actionBase}
`;

/**
 * Ukryte wzrokowo, czytane przez czytnik ekranu.
 *
 * Kolumna akcji nie potrzebuje widocznego nagłówka — ikony mówią same za siebie,
 * a napis „AKCJE" to kolejny wielkoliterowy element w linii, w której i tak jest
 * ich już pięć. Pusta komórka nagłówka byłaby jednak dla czytnika ekranu dziurą
 * („kolumna 6, puste"), więc nazwa zostaje, tylko poza obrazem.
 */
export const HiddenLabel = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
`;

export const RowActions = styled.div`
    display: inline-flex;
    gap: 4px;
    justify-content: flex-end;
`;
