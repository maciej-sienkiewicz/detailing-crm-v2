// src/modules/statistics/utils/reportDates.ts
//
// Daty w tabeli raportów (Statystyki → Raporty).

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/**
 * „2026-10-05" → „5 paź". Rok tylko przy dacie spoza bieżącego roku („29 gru 2025"):
 * w tabeli, w której prawie wszystko jest z tego roku, „.2026" przy każdym wierszu
 * to szum, a przy zeszłorocznym okresie to jedyna wskazówka, że chodzi o inny rok.
 */
export function shortDay(iso: string, thisYear = new Date().getFullYear()): string {
    const [year, month, dayOfMonth] = iso.split('-').map(Number);
    return `${dayOfMonth} ${MONTHS[month - 1]}${year === thisYear ? '' : ` ${year}`}`;
}

/** „14 wrz – 20 wrz"; przez przełom roku „29 gru 2025 – 4 sty". */
export const periodRange = (from: string, to: string, thisYear?: number) =>
    `${shortDay(from, thisYear)} – ${shortDay(to, thisYear)}`;
