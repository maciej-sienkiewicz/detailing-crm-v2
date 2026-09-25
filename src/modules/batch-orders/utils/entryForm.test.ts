import { describe, expect, it } from 'vitest';
import { emptyService, entryTotals, serviceToForm, toServiceItems, validateServices, type ServiceFormItem } from './entryForm';

const svc = (patch: Partial<ServiceFormItem>): ServiceFormItem => ({ ...emptyService(), ...patch });

describe('formularz wpisu zbiorczego', () => {
    // CLAUDE.md §1: brutto wpisane przez człowieka jedzie do serwera bez przeliczania.
    it('brutto 1900,00 dochodzi do payloadu jako 190000 gr, nie 190001', () => {
        const items = toServiceItems([svc({ name: 'Powłoka', netDisplay: '1544,72', grossDisplay: '1900,00', priceSide: 'gross' })]);
        expect(items).toEqual([{ name: 'Powłoka', netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 }]);
    });

    it('para z serwera wraca do pól bez zmiany', () => {
        const form = serviceToForm({ name: 'Powłoka', netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 });
        expect(form.grossDisplay).toBe('1900,00');
        expect(toServiceItems([form])[0].grossAmountCents).toBe(190000);
    });

    it('VAT w sumie to różnica pokazanych kwot', () => {
        const totals = entryTotals([
            svc({ name: 'A', netDisplay: '1544,72', grossDisplay: '1900,00' }),
            svc({ name: 'B', netDisplay: '500,00', grossDisplay: '615,00' }),
        ]);
        expect(totals).toEqual({ netCents: 204472, grossCents: 251500, vatCents: 47028 });
        expect(totals.netCents + totals.vatCents).toBe(totals.grossCents);
    });

    // Dawniej pozycja bez nazwy znikała przy zapisie razem z ceną - wpis wracał tańszy.
    it('odrzuca pozycję z ceną, ale bez nazwy', () => {
        const error = validateServices([
            svc({ name: 'Mycie', netDisplay: '100,00', grossDisplay: '123,00' }),
            svc({ name: '  ', netDisplay: '500,00', grossDisplay: '615,00' }),
        ]);
        expect(error).toMatch(/nie ma nazwy usługi/);
        expect(error).toMatch(/615,00/);
    });

    it('pusta dodatkowa pozycja nie blokuje zapisu i nie jedzie do serwera', () => {
        const services = [svc({ name: 'Mycie', netDisplay: '100,00', grossDisplay: '123,00' }), emptyService()];
        expect(validateServices(services)).toBeNull();
        expect(toServiceItems(services)).toHaveLength(1);
    });

    it('wymaga co najmniej jednej usługi', () => {
        expect(validateServices([emptyService()])).toBe('Dodaj co najmniej jedną usługę.');
    });
});
