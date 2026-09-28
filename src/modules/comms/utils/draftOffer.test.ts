import { describe, expect, it } from 'vitest';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { toDraftOffer } from './draftOffer';

const line = (patch: Partial<ServiceLineItem>): ServiceLineItem => ({
    id: Math.random().toString(36), serviceId: 's-1', serviceName: 'Powłoka ceramiczna',
    basePriceNet: 154_472, basePriceGross: 190_000, vatRate: 23, adjustment: { type: 'PERCENT', value: 0 }, ...patch,
});

describe('toDraftOffer', () => {
    it('cena wpisana jako 1 900,00 zł idzie do oferty jako 190000, nie 190001', () => {
        expect(toDraftOffer([line({})])).toEqual([
            { name: 'Powłoka ceramiczna', quantity: 1, priceGross: 190_000, regularPriceGross: undefined, note: undefined },
        ]);
    });

    it('rabat daje cenę po rabacie i cenę regularną z tej samej arytmetyki co zapis wyceny', () => {
        const [offer] = toDraftOffer([line({ adjustment: { type: 'FIXED_GROSS', value: 10_000 } })]);

        expect(offer.priceGross).toBe(180_000);
        expect(offer.regularPriceGross).toBe(190_000);
    });

    it('te same usługi w tej samej cenie zwijają się do ilości, inne ceny zostają osobno', () => {
        const offer = toDraftOffer([
            line({ serviceName: 'Mycie', basePriceNet: 20_325, basePriceGross: 25_000 }),
            line({ serviceName: 'Mycie', basePriceNet: 20_325, basePriceGross: 25_000 }),
            line({ serviceName: 'Mycie', basePriceNet: 20_325, basePriceGross: 25_000, note: 'z felgami' }),
        ]);

        expect(offer.map(o => [o.name, o.quantity, o.note])).toEqual([['Mycie', 2, undefined], ['Mycie', 1, 'z felgami']]);
    });
});
