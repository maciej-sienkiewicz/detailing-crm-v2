// src/modules/statistics/components/shared/format.ts
// Wspólne helpery formatowania i dat dla widoków statystyk.

export const today = () => new Date().toISOString().slice(0, 10);

export const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};

/** Pierwszy dzień bieżącego miesiąca - domyślny zakres obu widoków statystyk. */
export const currentMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** „sierpień" - podpowiedź przy presecie „Bieżący miesiąc". */
export const currentMonthName = () =>
    new Date().toLocaleDateString('pl-PL', { month: 'long' });

export const spDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

export const spMonthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
};

/** Kwota w złotówkach (float) → "1 234,56 zł" */
export const fmtPLN = (v: number) =>
    v.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 });

/** Kwota w groszach (int) → "1 235 zł" */
export const fmtPLNFromGrosz = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

export const fmtPct = (value: number, total: number) =>
    total > 0
        ? `${(value / total * 100).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`
        : '-';
