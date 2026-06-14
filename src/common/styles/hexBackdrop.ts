import { css } from 'styled-components';

/**
 * Subtelna, transparentna tekstura heksagonów (plaster miodu) kojarząca się
 * z dachem studia detailingowego. Nakładana na tło widoków, żeby przełamać
 * "szpitalną", płaską biel — w tle zawsze delikatnie coś się dzieje.
 *
 * Wzór został wygenerowany jako bezszwowo kafelkujący się honeycomb
 * (flat-top), kafel 48 × 27.71px. Krycie i kolor trzymamy bardzo nisko,
 * żeby tekstura nigdy nie konkurowała z treścią.
 *
 * Strojenie: HEX_STROKE (kolor linii) i HEX_OPACITY (krycie). Większe krycie
 * = wyraźniejsze heksagony.
 */

// slate-900 — chłodna, neutralna linia, która ładnie siada na jasnych tłach
const HEX_STROKE = '#0f172a';
// jak mocno widać siatkę (0–1). Celowo bardzo nisko, dla subtelnego efektu.
const HEX_OPACITY = 0.05;

// Ścieżka bezszwowo kafelkującego się honeycombu (patrz opis wyżej).
const HEX_PATH =
    'M-8 -13.86 L-16 0 L-32 0 L-40 -13.86 L-32 -27.71 L-16 -27.71ZM-8 13.86 L-16 27.71 L-32 27.71 L-40 13.86 L-32 0 L-16 0ZM-8 41.57 L-16 55.43 L-32 55.43 L-40 41.57 L-32 27.71 L-16 27.71ZM-8 69.28 L-16 83.14 L-32 83.14 L-40 69.28 L-32 55.43 L-16 55.43ZM-8 96.99 L-16 110.85 L-32 110.85 L-40 96.99 L-32 83.14 L-16 83.14ZM16 -27.71 L8 -13.86 L-8 -13.86 L-16 -27.71 L-8 -41.57 L8 -41.57ZM16 0 L8 13.86 L-8 13.86 L-16 0 L-8 -13.86 L8 -13.86ZM16 27.71 L8 41.57 L-8 41.57 L-16 27.71 L-8 13.86 L8 13.86ZM16 55.43 L8 69.28 L-8 69.28 L-16 55.43 L-8 41.57 L8 41.57ZM16 83.14 L8 96.99 L-8 96.99 L-16 83.14 L-8 69.28 L8 69.28ZM40 -13.86 L32 0 L16 0 L8 -13.86 L16 -27.71 L32 -27.71ZM40 13.86 L32 27.71 L16 27.71 L8 13.86 L16 0 L32 0ZM40 41.57 L32 55.43 L16 55.43 L8 41.57 L16 27.71 L32 27.71ZM40 69.28 L32 83.14 L16 83.14 L8 69.28 L16 55.43 L32 55.43ZM40 96.99 L32 110.85 L16 110.85 L8 96.99 L16 83.14 L32 83.14ZM64 -27.71 L56 -13.86 L40 -13.86 L32 -27.71 L40 -41.57 L56 -41.57ZM64 0 L56 13.86 L40 13.86 L32 0 L40 -13.86 L56 -13.86ZM64 27.71 L56 41.57 L40 41.57 L32 27.71 L40 13.86 L56 13.86ZM64 55.43 L56 69.28 L40 69.28 L32 55.43 L40 41.57 L56 41.57ZM64 83.14 L56 96.99 L40 96.99 L32 83.14 L40 69.28 L56 69.28ZM88 -13.86 L80 0 L64 0 L56 -13.86 L64 -27.71 L80 -27.71ZM88 13.86 L80 27.71 L64 27.71 L56 13.86 L64 0 L80 0ZM88 41.57 L80 55.43 L64 55.43 L56 41.57 L64 27.71 L80 27.71ZM88 69.28 L80 83.14 L64 83.14 L56 69.28 L64 55.43 L80 55.43ZM88 96.99 L80 110.85 L64 110.85 L56 96.99 L64 83.14 L80 83.14Z';

const encode = (svg: string) =>
    svg
        .replace(/"/g, '%22')
        .replace(/#/g, '%23')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');

const HEX_SVG =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="27.71" viewBox="0 0 48 27.71">` +
    `<path d="${HEX_PATH}" fill="none" stroke="${HEX_STROKE}" stroke-width="1" stroke-opacity="${HEX_OPACITY}"/>` +
    `</svg>`;

/** Gotowy `url(...)` z teksturą — przydatny np. do warstwowych teł. */
export const HEX_PATTERN_URL = `url("data:image/svg+xml,${encode(HEX_SVG)}")`;

/**
 * Mixin nakładający teksturę heksagonów jako warstwę `background-image`.
 * Ustawia wyłącznie własności `background-image/-size/-repeat/-position/
 * -attachment`, więc nie nadpisuje koloru tła kontenera — wystarczy wstawić
 * go PO deklaracji `background`/`background-color` danego kontenera.
 *
 * `background-attachment: fixed` zakotwicza wzór w viewporcie, dzięki czemu
 * tekstura jest spójna między widokami i daje delikatny efekt parallaksy
 * podczas scrollowania.
 */
export const hexBackdrop = css`
    background-image: ${HEX_PATTERN_URL};
    background-size: 60px auto;
    background-position: center top;
    background-repeat: repeat;
    background-attachment: fixed;
`;
