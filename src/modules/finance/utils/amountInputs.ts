// src/modules/finance/utils/amountInputs.ts
//
// Pola kwot w ręcznie dodawanych dokumentach finansowych. Arytmetyka VAT idzie przez
// wspólne helpery w groszach (priceAdjustment.ts): liczenie na złotówkach
// zmiennoprzecinkowo (`netto × 1,23`, `(netto × 0,23).toFixed(2)`) gubiło grosz tam,
// gdzie iloczyn kończy się na pół grosza - 13,50 × 0,23 = 3,105 jest w pamięci
// komputera odrobinę mniejsze, więc VAT wychodził 3,10 zamiast 3,11.

import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate, storedPriceSide, type PriceInputFormat, type PriceSide } from '@/common/utils/priceInputs';
import { groszToInputValue } from './formatters';

/** Treść pola kwoty → grosze; `null`, gdy w polu nie ma jeszcze liczby. */
const amountInputToGrosze = (raw: string): number | null => {
    const pln = parseFloat(raw.replace(',', '.'));
    return Number.isFinite(pln) ? Math.round(pln * 100) : null;
};

// ─── Faktura kosztowa (AddExpenseModal) ──────────────────────────────────────

/** Stawka z listy wyboru faktury kosztowej w postaci dla priceAdjustment: „zw" → -1. */
export const expenseVatRate = (value: string): number => (value === 'zw' ? -1 : Number(value));

/**
 * Pola kwot faktury kosztowej dla `priceInputsForVatRate`. Kropka, bo tylko taki
 * separator przepuszcza pole tego formularza.
 */
export const EXPENSE_AMOUNT_INPUT: PriceInputFormat = {
    toCents: amountInputToGrosze,
    toInput: groszToInputValue,
};

/** Brutto do pola obok wpisanego netto; puste, gdy netto nie jest jeszcze liczbą. */
export const expenseGrossForNet = (netRaw: string, vatRate: number): string => {
    const net = amountInputToGrosze(netRaw);
    return net === null ? '' : groszToInputValue(netToGross(net, vatRate));
};

/** Netto do pola obok wpisanego brutto; puste, gdy brutto nie jest jeszcze liczbą. */
export const expenseNetForGross = (grossRaw: string, vatRate: number): string => {
    const gross = amountInputToGrosze(grossRaw);
    return gross === null ? '' : groszToInputValue(grossToNet(gross, vatRate));
};

// ─── Dokument przychodowy (CreateDocumentModal, EditDocumentModal) ───────────

/** Stawka domyślna nowego dokumentu. Okna dokumentu mają wybór stawki (DocumentAmounts). */
export const DOCUMENT_VAT_RATE = 23;

/**
 * VAT do pola obok wpisanego netto. VAT to RÓŻNICA brutto i netto (CLAUDE.md §1),
 * więc netto + VAT daje dokładnie to brutto, które pokazuje reszta aplikacji.
 * Puste, gdy netto nie jest jeszcze liczbą.
 */
export const documentVatForNet = (netRaw: string, vatRate: number = DOCUMENT_VAT_RATE): string => {
    const net = amountInputToGrosze(netRaw);
    return net === null ? '' : groszToInputValue(netToGross(net, vatRate) - net);
};

// ─── Kwoty dokumentu przychodowego: stawka, netto, brutto ────────────────────
//
// Okna dokumentu liczyły VAT zawsze po 23% i składały brutto jako netto + VAT.
// Paragon na usługę z 8% przy każdej edycji kwoty dostawał VAT 23%, a brutto wpisane
// przez człowieka (1900,00 zł) nie dawało się wpisać wcale - było tylko pole netto.
// Teraz jest stawka, oba pola, a wpisana strona zostaje co do grosza (CLAUDE.md §1).

export const DOCUMENT_VAT_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '23', label: '23%' },
    { value: '8',  label: '8%' },
    { value: '5',  label: '5%' },
    { value: '0',  label: '0%' },
    { value: 'zw', label: 'zw.' },
];

export interface DocumentAmounts {
    net: string;
    gross: string;
    /** Wartość z DOCUMENT_VAT_OPTIONS. */
    vatRate: string;
    /** Pole wpisane przez człowieka - zostaje nietknięte przy zmianie stawki. */
    priceSide: PriceSide;
}

export const EMPTY_DOCUMENT_AMOUNTS: DocumentAmounts = {
    net: '', gross: '', vatRate: String(DOCUMENT_VAT_RATE), priceSide: 'gross',
};

/**
 * Stawka zapisanego dokumentu, odczytana z jego kwot - dokument jej nie przechowuje.
 * Pierwsza stawka, przy której para netto/brutto wychodzi z przeliczenia w którąkolwiek
 * stronę; kwoty zerowe i niepasujące do żadnej stawki zostają przy domyślnej.
 */
export const inferDocumentVatRate = (netCents: number, grossCents: number): string => {
    if (grossCents <= 0) return String(DOCUMENT_VAT_RATE);
    if (netCents === grossCents) return '0';
    const match = DOCUMENT_VAT_OPTIONS
        .map(o => o.value)
        .filter(v => v !== 'zw' && v !== '0')
        .find(v => netToGross(netCents, Number(v)) === grossCents || grossToNet(grossCents, Number(v)) === netCents);
    return match ?? String(DOCUMENT_VAT_RATE);
};

/** Pola kwot otwartego dokumentu. Strona wpisana: brutto, chyba że para wyszła z netta. */
export const documentAmountsFrom = (netCents: number, grossCents: number): DocumentAmounts => {
    const vatRate = inferDocumentVatRate(netCents, grossCents);
    return {
        net: groszToInputValue(netCents),
        gross: groszToInputValue(grossCents),
        vatRate,
        priceSide: storedPriceSide(netCents, grossCents, expenseVatRate(vatRate)),
    };
};

export const withDocumentNet = (a: DocumentAmounts, raw: string): DocumentAmounts =>
    ({ ...a, net: raw, gross: expenseGrossForNet(raw, expenseVatRate(a.vatRate)), priceSide: 'net' });

export const withDocumentGross = (a: DocumentAmounts, raw: string): DocumentAmounts =>
    ({ ...a, gross: raw, net: expenseNetForGross(raw, expenseVatRate(a.vatRate)), priceSide: 'gross' });

export const withDocumentVatRate = (a: DocumentAmounts, vatRate: string): DocumentAmounts => {
    const { net, gross } = priceInputsForVatRate(
        { net: a.net, gross: a.gross },
        expenseVatRate(a.vatRate), expenseVatRate(vatRate), a.priceSide, EXPENSE_AMOUNT_INPUT,
    );
    return { ...a, vatRate, net, gross };
};

/** Kwoty do zapisu w groszach; VAT to RÓŻNICA brutto i netto. `null`, gdy pola są niepełne. */
export const documentAmountsToCents = (
    a: DocumentAmounts,
): { totalNet: number; totalVat: number; totalGross: number } | null => {
    const totalNet = amountInputToGrosze(a.net);
    const totalGross = amountInputToGrosze(a.gross);
    if (totalNet === null || totalGross === null) return null;
    return { totalNet, totalVat: totalGross - totalNet, totalGross };
};
