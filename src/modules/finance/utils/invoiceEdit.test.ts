import { describe, it, expect } from 'vitest';
import type { RevenueInvoiceItem } from '../types';
import { correctedLinesPayload, editChange, editLinesFromItems, newEditLine } from './invoiceEdit';

// Faktura z 27.10.2026, na której klient wskazał literówkę w numerze rejestracyjnym.
const items: RevenueInvoiceItem[] = [
    {
        lineNumber: 1, name: 'Oklejenie pojazdu - PY 4622M', unit: 'usł.', quantity: 1,
        unitPriceNet: 1_800_000, netValue: 1_800_000, vatValue: 414_000, grossValue: 2_214_000,
        vatRate: '23', unitPriceGross: 2_214_000, priceMode: 'GROSS',
    },
    {
        lineNumber: 2, name: 'Mycie', unit: 'usł.', quantity: 1,
        unitPriceNet: 16_260, netValue: 16_260, vatValue: 3_740, grossValue: 20_000,
        vatRate: '23', unitPriceGross: null, priceMode: 'NET',
    },
];

describe('korekta faktury jak edycja', () => {
    it('pozycje trafiają do edytora w cenie, w której je wpisano', () => {
        const lines = editLinesFromItems(items);
        expect(lines.map((line) => [line.price, line.priceMode])).toEqual([['22140.00', 'GROSS'], ['162.60', 'NET']]);
    });

    it('poprawka samej nazwy nie zmienia kwot', () => {
        const lines = editLinesFromItems(items);
        expect(editChange(lines, items)).toBe('none');

        lines[0] = { ...lines[0], name: 'Oklejenie pojazdu - PY 4662M' };
        expect(editChange(lines, items)).toBe('description');
    });

    it('ilość, usunięcie i dopisanie pozycji zmieniają kwoty', () => {
        const lines = editLinesFromItems(items);
        expect(editChange([{ ...lines[0], quantity: '2' }, lines[1]], items)).toBe('amounts');
        expect(editChange([lines[0]], items)).toBe('amounts');
        expect(editChange([...lines, { ...newEditLine(), name: 'Wosk', price: '100' }], items)).toBe('amounts');
    });

    it('do serwera idzie tylko strona ceny wpisana na fakturze - brutto co do grosza', () => {
        const lines = editLinesFromItems(items);
        lines[0] = { ...lines[0], name: 'Oklejenie pojazdu - PY 4662M' };
        const payload = correctedLinesPayload(lines)!;

        expect(payload[0]).toEqual({
            originalLineNumber: 1, name: 'Oklejenie pojazdu - PY 4662M', unit: 'usł.', quantity: 1,
            unitPriceGross: 2_214_000, vatRate: '23',
        });
        expect(payload[1]).not.toHaveProperty('unitPriceGross');
        expect(payload[1].unitPriceNet).toBe(16_260);
    });

    it('niepełna pozycja blokuje wysyłkę', () => {
        expect(correctedLinesPayload([...editLinesFromItems(items), newEditLine()])).toBeNull();
    });
});
