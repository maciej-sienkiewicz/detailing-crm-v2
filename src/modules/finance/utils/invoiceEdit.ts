// src/modules/finance/utils/invoiceEdit.ts
//
// Korekta faktury KSeF „jak edycja" - tak, jak poprawia fakturę program księgowy: otwierasz
// pozycje, zmieniasz to, co błędne, a serwer sam składa korektę z wierszy „przed" i „po".
// Kwoty liczy wyłącznie serwer (ten sam rachunek co przy wystawieniu faktury) - tu tylko
// przenosimy to, co wpisał człowiek, w groszach i w tej samej stronie ceny (CLAUDE.md §1).

import type { CorrectedLineRequest, RevenueInvoiceItem, RevenueVatRate } from '../types';
import { groszToInputValue } from './formatters';

export interface EditLine {
    /** Klucz wiersza w edytorze (pozycje dopisane nie mają numeru z faktury). */
    key: string;
    /** Numer pozycji na fakturze; null - pozycja dopisana w korekcie. */
    originalLineNumber: number | null;
    name: string;
    unit: string;
    quantity: string;
    /** Cena jednostkowa w tej stronie, w której wpisano ją na fakturze. */
    price: string;
    priceMode: 'NET' | 'GROSS';
    vatRate: string;
}

export const VAT_RATE_OPTIONS: RevenueVatRate[] = ['23', '8', '5', '0', 'zw'];

/** Gotowe przyczyny - te, z którymi studio dzwoni najczęściej. */
export const CORRECTION_REASONS = [
    'Błędny numer rejestracyjny',
    'Błąd w nazwie usługi',
    'Błędna ilość lub cena',
];

const toGrosze = (raw: string): number | null => {
    const value = parseFloat(raw.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(value) ? Math.round(value * 100) : null;
};

const toQuantity = (raw: string): number | null => {
    const value = parseFloat(raw.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
};

/** Pozycje faktury jako wiersze edytora - bez wierszy „przed korektą" (te są historią). */
export const editLinesFromItems = (items: RevenueInvoiceItem[]): EditLine[] =>
    items
        .filter((item) => !item.stateBefore)
        .map((item) => {
            const gross = item.priceMode === 'GROSS' && item.unitPriceGross != null;
            return {
                key: `line-${item.lineNumber}`,
                originalLineNumber: item.lineNumber,
                name: item.name,
                unit: item.unit ?? '',
                quantity: String(item.quantity),
                price: groszToInputValue(gross ? item.unitPriceGross! : item.unitPriceNet),
                priceMode: gross ? 'GROSS' : 'NET',
                vatRate: item.vatRate,
            };
        });

let addedCounter = 0;

/** Nowa, pusta pozycja dopisana w korekcie - cena brutto, jak zwykle przy usługach. */
export const newEditLine = (): EditLine => ({
    key: `added-${++addedCounter}`,
    originalLineNumber: null,
    name: '',
    unit: 'usł.',
    quantity: '1',
    price: '',
    priceMode: 'GROSS',
    vatRate: '23',
});

/** Co zmienia korekta: nic, sam opis (nazwa, jednostka) czy także kwoty. */
export type EditChange = 'none' | 'description' | 'amounts';

export const editChange = (lines: EditLine[], items: RevenueInvoiceItem[]): EditChange => {
    const originals = items.filter((item) => !item.stateBefore);
    let description = false;
    let amounts = false;
    for (const item of originals) {
        const line = lines.find((candidate) => candidate.originalLineNumber === item.lineNumber);
        if (!line) { amounts = true; continue; }
        const originalPrice = item.priceMode === 'GROSS' && item.unitPriceGross != null ? item.unitPriceGross : item.unitPriceNet;
        if (toQuantity(line.quantity) !== item.quantity || toGrosze(line.price) !== originalPrice || line.vatRate !== item.vatRate) {
            amounts = true;
        }
        if (line.name.trim() !== item.name.trim() || line.unit.trim() !== (item.unit ?? '').trim()) description = true;
    }
    if (lines.some((line) => line.originalLineNumber === null)) amounts = true;
    return amounts ? 'amounts' : description ? 'description' : 'none';
};

/** Wiersz, którego nie da się wysłać - nazwa, ilość i cena muszą być wpisane. */
export const lineProblem = (line: EditLine): string | null => {
    if (!line.name.trim()) return 'Wpisz nazwę pozycji';
    const quantity = toQuantity(line.quantity);
    if (quantity === null || quantity <= 0) return 'Ilość musi być większa od zera';
    const price = toGrosze(line.price);
    if (price === null || price < 0) return 'Wpisz cenę';
    return null;
};

/** Pozycje po korekcie do API; null, gdy któraś jest niepełna. */
export const correctedLinesPayload = (lines: EditLine[]): CorrectedLineRequest[] | null => {
    if (lines.length === 0 || lines.some((line) => lineProblem(line) !== null)) return null;
    return lines.map((line) => {
        const price = toGrosze(line.price)!;
        return {
            originalLineNumber: line.originalLineNumber,
            name: line.name.trim(),
            unit: line.unit.trim() || undefined,
            quantity: toQuantity(line.quantity)!,
            // Tylko strona wpisana przez człowieka - drugą liczy serwer (CLAUDE.md §1).
            ...(line.priceMode === 'GROSS' ? { unitPriceGross: price } : { unitPriceNet: price }),
            vatRate: line.vatRate,
        };
    });
};
