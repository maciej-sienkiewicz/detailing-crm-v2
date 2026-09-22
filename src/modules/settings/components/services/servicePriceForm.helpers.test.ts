import { describe, it, expect } from 'vitest';
import { parseMoneyInput } from '@/modules/services/utils/priceCalculator';
import { grossToNet } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate, storedPriceSide } from '@/common/utils/priceInputs';
import { formatDecimalInput, SERVICE_PRICE_INPUT } from './servicePriceForm.helpers';

/*
 * Formularz usługi i pakietu w Ustawieniach → Usługi. Tak liczył się payload
 * `{ basePriceNet, basePriceGross }`: parseMoneyInput na treści obu pól.
 */
const payload = (fields: { net: string; gross: string }) => ({
    basePriceNet: parseMoneyInput(fields.net),
    basePriceGross: parseMoneyInput(fields.gross),
});

describe('formatDecimalInput', () => {
    it('grosze → pole z przecinkiem i dwoma miejscami', () => {
        expect(formatDecimalInput(190000)).toBe('1900,00');
        expect(formatDecimalInput(154472)).toBe('1544,72');
        expect(formatDecimalInput(5)).toBe('0,05');
        expect(formatDecimalInput(0)).toBe('0,00');
    });
});

describe('SERVICE_PRICE_INPUT', () => {
    it('puste i zerowe pole to brak ceny - jak przy wpisywaniu', () => {
        expect(SERVICE_PRICE_INPUT.toCents('')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents('0')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents('0,00')).toBeNull();
        expect(SERVICE_PRICE_INPUT.toCents(',')).toBeNull();
    });

    it('kwota → grosze, w obie strony bez zmian', () => {
        expect(SERVICE_PRICE_INPUT.toCents('1900,00')).toBe(190000);
        expect(SERVICE_PRICE_INPUT.toCents('1900')).toBe(190000);
        expect(SERVICE_PRICE_INPUT.toCents(SERVICE_PRICE_INPUT.toInput(154472))).toBe(154472);
    });
});

describe('formularz cennika: zmiana stawki VAT', () => {
    const change = (fields: { net: string; gross: string }, from: number, to: number, side: 'net' | 'gross') =>
        priceInputsForVatRate(fields, from, to, side, SERVICE_PRICE_INPUT);

    it('brutto wpisane 1900,00 przy 23% → 8% → 23% wraca jako 190000 gr, nie 190001', () => {
        // Wpisano brutto „1900" - netto policzył handleGrossChange.
        const typed = { net: formatDecimalInput(grossToNet(190000, 23)), gross: '1900' };
        const at8 = change(typed, 23, 8, 'gross');
        expect(at8).toEqual({ net: '1759,26', gross: '1900' });

        const back = change(at8, 8, 23, 'gross');
        expect(payload(back)).toEqual({ basePriceNet: 154472, basePriceGross: 190000 });
    });

    it('usługa z katalogu z brutto wpisanym od strony brutto: zapisane brutto przeżywa zmianę', () => {
        const stored = { basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 };
        // Tak otwiera się formularz edycji (serviceToForm/packageToForm).
        const fields = { net: formatDecimalInput(stored.basePriceNet), gross: formatDecimalInput(stored.basePriceGross) };
        const side = storedPriceSide(stored.basePriceNet, stored.basePriceGross, stored.vatRate);
        expect(side).toBe('gross');

        const back = change(change(fields, 23, 8, side), 8, 23, side);
        expect(payload(back).basePriceGross).toBe(190000);
    });

    it('wpisane netto zostaje, brutto liczy się przy nowej stawce', () => {
        expect(change({ net: '150,00', gross: '184,50' }, 23, 8, 'net')).toEqual({ net: '150,00', gross: '162,00' });
        // Usługa z katalogu, której pary nie da się rozstrzygnąć: dotychczasowe netto.
        expect(storedPriceSide(15000, 18450, 23)).toBe('net');
    });

    it('ta sama stawka: nic się nie przelicza', () => {
        const fields = { net: '1544,72', gross: '1900,00' };
        expect(change(fields, 23, 23, 'net')).toBe(fields);
        expect(change(fields, 23, 23, 'gross')).toBe(fields);
    });

    it('ZW: wpisana strona zostaje, druga jej równa', () => {
        expect(change({ net: '1544,72', gross: '1900,00' }, 23, -1, 'gross')).toEqual({ net: '1900,00', gross: '1900,00' });
        expect(change({ net: '150,00', gross: '184,50' }, 23, -1, 'net')).toEqual({ net: '150,00', gross: '150,00' });
    });

    it('zero albo puste pole wpisane czyści drugie, zamiast pokazywać 0,00', () => {
        expect(change({ net: '0', gross: '' }, 23, 8, 'net')).toEqual({ net: '0', gross: '' });
        expect(change({ net: '', gross: '' }, 23, 8, 'gross')).toEqual({ net: '', gross: '' });
    });
});
