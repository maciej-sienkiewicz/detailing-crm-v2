// src/modules/finance/utils/amountInputs.ts
//
// Pola kwot w ręcznie dodawanych dokumentach finansowych. Arytmetyka VAT idzie przez
// wspólne helpery w groszach (priceAdjustment.ts): liczenie na złotówkach
// zmiennoprzecinkowo (`netto × 1,23`, `(netto × 0,23).toFixed(2)`) gubiło grosz tam,
// gdzie iloczyn kończy się na pół grosza - 13,50 × 0,23 = 3,105 jest w pamięci
// komputera odrobinę mniejsze, więc VAT wychodził 3,10 zamiast 3,11.

import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import type { PriceInputFormat } from '@/common/utils/priceInputs';
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

/** Okna dokumentu nie mają wyboru stawki - VAT liczy się zawsze przy 23%. */
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
