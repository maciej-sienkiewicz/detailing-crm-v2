// @vitest-environment jsdom
//
// priceFieldSide rozpoznaje, w którym z dwóch pól PriceInput człowiek pisał - od tego
// zależy, którą stronę ceny zachowa zmiana stawki VAT (CLAUDE.md §1). Całą drogę
// (wpisanie brutta 1900,00 → 8% → 23% → wciąż 1900,00) sprawdzają testy okien:
// QuickServiceModal.test.tsx i checkin/components/ManualPriceModal.test.tsx.
import { describe, expect, it } from 'vitest';
import { priceFieldSide } from './useTypedPriceSide';

/** Obudowa z polami w kolejności PriceInput: [netto, brutto], plus coś obok. */
const fields = () => {
    const container = document.createElement('div');
    container.innerHTML = '<input id="net" /><input id="gross" /><span id="vat">VAT</span>';
    return {
        container,
        net: container.querySelector('#net')!,
        gross: container.querySelector('#gross')!,
        vat: container.querySelector('#vat')!,
    };
};

describe('priceFieldSide', () => {
    it('pierwsze pole to netto, drugie to brutto', () => {
        const { container, net, gross } = fields();

        expect(priceFieldSide(container, net)).toBe('net');
        expect(priceFieldSide(container, gross)).toBe('gross');
    });

    it('zdarzenie spoza pól ceny nie mówi nic o wpisanej stronie', () => {
        const { container, vat } = fields();

        expect(priceFieldSide(container, vat)).toBeNull();
        expect(priceFieldSide(container, document.createElement('input'))).toBeNull();
        expect(priceFieldSide(null, vat)).toBeNull();
        expect(priceFieldSide(container, null)).toBeNull();
    });
});
