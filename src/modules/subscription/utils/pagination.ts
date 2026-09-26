// src/modules/subscription/utils/pagination.ts
//
// Okno numerów stron. Historia płatności renderowała przycisk dla KAŻDEJ strony -
// po dwóch latach comiesięcznych płatności i zmian modułów to kilkanaście przycisków
// w rzędzie, który na telefonie wypychał treść poza ekran (strona ma overflow-x: clip,
// więc końcówka po prostu znikała razem z „Następna").

export type PageItem = number | 'gap';

/**
 * Strony do pokazania (0-based): pierwsza, ostatnia i `siblings` sąsiadów bieżącej,
 * z „gap" w miejscu pominiętych. Luka zastępuje co najmniej dwie strony - pojedynczą
 * pominiętą stronę taniej pokazać, niż wstawiać zamiast niej „…".
 */
export function pageWindow(current: number, total: number, siblings = 1): PageItem[] {
    if (total <= 0) return [];
    const last = total - 1;
    const from = Math.max(0, current - siblings);
    const to = Math.min(last, current + siblings);

    const pages = new Set<number>([0, last]);
    for (let i = from; i <= to; i++) pages.add(i);

    const sorted = [...pages].sort((a, b) => a - b);
    const out: PageItem[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const page = sorted[i];
        const prev = sorted[i - 1];
        if (prev !== undefined) {
            if (page - prev === 2) out.push(prev + 1);
            else if (page - prev > 2) out.push('gap');
        }
        out.push(page);
    }
    return out;
}
