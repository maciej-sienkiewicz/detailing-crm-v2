import type { CostExpenseItem } from './costTypes';

/**
 * Kwoty pozycji kosztowej z KSeF: domknięcie brakującej strony netto ⇄ brutto.
 *
 * Faktury kosztowe bywają wypełnione tylko po jednej stronie - część sprzedawców
 * podaje samo brutto (P_11A), część samo netto (P_11). Dopóki suma brutto liczyła
 * takie pozycje, a suma netto je pomijała, różnica brutto−netto w KPI rosła daleko
 * ponad realny VAT.
 */

/**
 * Stawka VAT w procentach z pola P_12.
 *
 * KSeF podaje stawkę jako gołą liczbę ("23", "8"), nie "23%". Kody bez VAT
 * ("zw" - zwolniony, "np" - nie podlega, "oo" - odwrotne obciążenie,
 * "0"/"0 KR"/"0 WDT"/"0 EXP") dają 0%: netto == brutto. Nierozpoznany kod zwraca
 * null - wtedy nic nie doliczamy, zamiast zgadywać.
 */
export function parseVatRate(vatRate: string | null): number | null {
    if (!vatRate) return null;
    const code = vatRate.trim().replace(/\s+/g, ' ').replace(/%$/, '').trim().toLowerCase();
    if (!code) return null;
    if (['zw', 'np', 'oo'].includes(code) || /^0( kr| wdt| exp)?$/.test(code)) return 0;
    const m = code.match(/^(\d+(?:[.,]\d+)?)$/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/** Brutto pozycji - z faktury, a gdy go brak, doliczone do netto wg stawki VAT. */
export function effectiveGross(item: CostExpenseItem): number {
    if (item.grossValue != null) return item.grossValue;
    if (item.netValue != null) {
        const rate = parseVatRate(item.vatRate);
        if (rate == null) return item.netValue;
        return item.netValue * (1 + rate / 100);
    }
    return 0;
}

/**
 * Netto pozycji - z faktury, a gdy sprzedawca go nie wypełnił, wyliczone „w stu"
 * z brutto. Backend uzupełnia netto już w /expense-items; tutaj zostaje
 * zabezpieczenie na starsze odpowiedzi API i pozycje, których nie dało się domknąć.
 */
export function effectiveNet(item: CostExpenseItem): number {
    if (item.netValue != null) return item.netValue;
    if (item.grossValue != null) {
        const rate = parseVatRate(item.vatRate);
        if (rate == null) return 0;
        return item.grossValue / (1 + rate / 100);
    }
    return 0;
}

/** true, gdy netto tej pozycji nie było na fakturze i zostało wyliczone z brutto. */
export function isNetDerived(item: CostExpenseItem): boolean {
    return item.amountsDerived === true || (item.netValue == null && item.grossValue != null);
}
