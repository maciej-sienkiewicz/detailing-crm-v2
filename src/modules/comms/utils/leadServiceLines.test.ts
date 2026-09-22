// Wycena leada przechodzi przez edytor usług i wraca na serwer - na każdej z tych granic
// brutto uzgodnione z klientem ma przejść dokładnie. Regresja z CLAUDE.md §1: 1900,00 zł
// brutto (23%) to 154472 gr netto, a z tego netta wychodzi 1900,01 zł, więc brutto
// odtworzone z netta zmieniłoby cenę, którą klient już dostał w ofercie.
import { describe, expect, it } from 'vitest';
import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { LeadServiceItem } from '../types';
import { toLeadInputs, toQuoteRow, toQuoteRows, toServiceLines, totalGrossOf } from './leadServiceLines';

/** Pozycja wyceny za 1900,00 zł brutto przy 23%. */
const leadItem = (overrides: Partial<LeadServiceItem> = {}): LeadServiceItem => ({
    id: 'item-1',
    serviceId: 'svc-1',
    name: 'Powłoka ceramiczna',
    priceGross: 190_000,
    priceNet: 154_472,
    vatRate: 23,
    note: null,
    quantity: 1,
    totalGross: 190_000,
    status: 'ACCEPTED',
    source: 'MANUAL',
    priceSource: 'CATALOG',
    ...overrides,
});

/** Wiersz edytora z ceną 1900,00 zł brutto i bez rabatu. */
const line = (overrides: Partial<ServiceLineItem> = {}): ServiceLineItem => ({
    id: 'line-1',
    serviceId: 'svc-1',
    serviceName: 'Powłoka ceramiczna',
    basePriceNet: 154_472,
    basePriceGross: 190_000,
    vatRate: 23,
    adjustment: { type: 'PERCENT', value: 0 },
    note: '',
    ...overrides,
});

describe('toServiceLines', () => {
    it('brutto 1900,00 wchodzi do edytora jako dokładne brutto bazowe, bez rabatu', () => {
        const [row] = toServiceLines([leadItem()]);

        expect(row).toEqual({
            id: 'item-1_0',
            serviceId: 'svc-1',
            serviceName: 'Powłoka ceramiczna',
            basePriceNet: 154_472,
            basePriceGross: 190_000,
            vatRate: 23,
            adjustment: { type: 'PERCENT', value: 0 },
            note: '',
        });
        // Edytor pokaże i zapisze 1900,00 - nie 1900,01 z przeliczenia netta.
        expect(totalGrossOf([row])).toBe(190_000);
    });

    it('pozycja bez zapisanego netta: netto liczone z brutto, brutto nietknięte', () => {
        const [row] = toServiceLines([leadItem({ priceNet: null })]);

        expect(row.basePriceNet).toBe(grossToNet(190_000, 23));
        expect(row.basePriceGross).toBe(190_000);
    });

    it('pozycja bez stawki (sprzed V75) dostaje 23%', () => {
        const [row] = toServiceLines([leadItem({ vatRate: null, priceNet: null, priceGross: 12_300 })]);

        expect(row.vatRate).toBe(23);
        expect(row.basePriceNet).toBe(10_000);
        expect(row.basePriceGross).toBe(12_300);
    });

    it('pozycja zwolniona (zw) zostaje zwolniona, netto równe brutto', () => {
        const [row] = toServiceLines([leadItem({ vatRate: -1, priceNet: null, priceGross: 50_000 })]);

        expect(row).toMatchObject({ vatRate: -1, basePriceNet: 50_000, basePriceGross: 50_000 });
    });

    it('do edytora trafiają tylko pozycje przyjęte - sugestie mają własną sekcję', () => {
        const rows = toServiceLines([leadItem(), leadItem({ id: 'ai-1', status: 'SUGGESTED', source: 'AI' })]);

        expect(rows.map(r => r.id)).toEqual(['item-1_0']);
    });

    it('ilość rozwija się na wiersze o tej samej cenie, a suma zgadza się co do grosza', () => {
        const rows = toServiceLines([leadItem({ quantity: 3, totalGross: 570_000 })]);

        expect(rows.map(r => r.id)).toEqual(['item-1_0', 'item-1_1', 'item-1_2']);
        expect(rows.every(r => r.basePriceGross === 190_000 && r.basePriceNet === 154_472)).toBe(true);
        expect(totalGrossOf(rows)).toBe(570_000);
    });

    it('ilość z literówki rozwija się najwyżej na 50 wierszy, zero - na jeden', () => {
        expect(toServiceLines([leadItem({ quantity: 1_000 })])).toHaveLength(50);
        expect(toServiceLines([leadItem({ quantity: 0 })])).toHaveLength(1);
    });

    it('notatka przechodzi na każdy wiersz', () => {
        const rows = toServiceLines([leadItem({ quantity: 2, note: 'bez zderzaka' })]);

        expect(rows.map(r => r.note)).toEqual(['bez zderzaka', 'bez zderzaka']);
    });
});

describe('toLeadInputs', () => {
    it('wiersz 1900,00 bez rabatu wraca na serwer jako 1900,00 brutto i 1544,72 netto', () => {
        expect(toLeadInputs([line({ note: '  bez zderzaka ' })])).toEqual([
            {
                serviceId: 'svc-1',
                name: 'Powłoka ceramiczna',
                priceGross: 190_000,
                priceNet: 154_472,
                vatRate: 23,
                note: 'bez zderzaka',
                quantity: 1,
            },
        ]);
    });

    it('wycena przechodzi przez edytor i wraca bez zmiany jednego grosza', () => {
        const items = [
            leadItem({ quantity: 2, totalGross: 380_000 }),
            leadItem({ id: 'item-2', serviceId: null, name: 'Pranie tapicerki', priceGross: 45_000, priceNet: null, vatRate: 8, totalGross: 45_000 }),
            leadItem({ id: 'item-3', name: 'Szkolenie', priceGross: 50_000, priceNet: 50_000, vatRate: -1, totalGross: 50_000 }),
        ];

        const inputs = toLeadInputs(toServiceLines(items));

        expect(inputs.map(i => [i.priceGross, i.priceNet, i.vatRate])).toEqual([
            [190_000, 154_472, 23],
            [190_000, 154_472, 23],
            [45_000, grossToNet(45_000, 8), 8],
            [50_000, 50_000, -1],
        ]);
        expect(inputs.every(i => i.quantity === 1)).toBe(true);
        expect(inputs[1].serviceId).toBe('svc-1');
        expect(inputs[2].serviceId).toBeNull();
    });

    it('„ustaw brutto" wysyła dokładnie wpisane brutto, a netto „w stu"', () => {
        const [input] = toLeadInputs([line({ adjustment: { type: 'SET_GROSS', value: 190_000 }, basePriceNet: 200_000, basePriceGross: 246_000 })]);

        expect(input.priceGross).toBe(190_000);
        expect(input.priceNet).toBe(154_472);
    });

    it('upust brutto 100,00 schodzi z dokładnego brutto: 1800,00, nie 1800,01', () => {
        const [input] = toLeadInputs([line({ adjustment: { type: 'FIXED_GROSS', value: 10_000 } })]);

        expect(input.priceGross).toBe(180_000);
        expect(input.priceNet).toBe(146_341);
    });

    it('rabat od netta zmienia kwotę bazową, więc brutto liczy się z netta końcowego', () => {
        const [input] = toLeadInputs([line({ adjustment: { type: 'PERCENT', value: -10 } })]);

        expect(input.priceNet).toBe(139_025);
        expect(input.priceGross).toBe(netToGross(139_025, 23));
    });

    it('wiersz bez dokładnego brutto (np. po zbiorczej zmianie stawki) liczy brutto z netta', () => {
        const [input] = toLeadInputs([line({ basePriceNet: 10_000, basePriceGross: undefined, vatRate: 8 })]);

        expect(input.priceNet).toBe(10_000);
        expect(input.priceGross).toBe(10_800);
    });

    it('pusta notatka nie jest wysyłana', () => {
        expect(toLeadInputs([line({ note: '   ' })])[0].note).toBeUndefined();
        expect(toLeadInputs([line({ note: undefined })])[0].note).toBeUndefined();
    });
});

describe('toQuoteRow', () => {
    it('brutto z serwera, netto zapisane, VAT jako różnica', () => {
        expect(toQuoteRow(leadItem({ note: 'bez zderzaka' }))).toEqual({
            id: 'item-1',
            name: 'Powłoka ceramiczna',
            note: 'bez zderzaka',
            quantity: 1,
            netCents: 154_472,
            vatCents: 35_528,
            grossCents: 190_000,
        });
    });

    it('przy ilości brutto to kwota łączna z serwera, a netto to netto jednostkowe × ilość', () => {
        const row = toQuoteRow(leadItem({ quantity: 3, totalGross: 570_000 }));

        expect(row.grossCents).toBe(570_000);
        expect(row.netCents).toBe(3 * 154_472);
        expect(row.vatCents).toBe(570_000 - 3 * 154_472);
    });

    it('pozycja bez zapisanego netta: netto „w stu" z brutto, kolumny sumują się do brutto', () => {
        const row = toQuoteRow(leadItem({ priceNet: null }));

        expect(row.netCents).toBe(154_472);
        expect(row.netCents + row.vatCents).toBe(row.grossCents);
    });

    it('pozycja bez stawki liczy netto przy 23%', () => {
        const row = toQuoteRow(leadItem({ vatRate: null, priceNet: null, priceGross: 12_300, totalGross: 12_300 }));

        expect(row).toMatchObject({ netCents: 10_000, vatCents: 2_300, grossCents: 12_300 });
    });

    it('pozycja zwolniona nie ma VAT-u', () => {
        const row = toQuoteRow(leadItem({ vatRate: -1, priceNet: 50_000, priceGross: 50_000, totalGross: 50_000 }));

        expect(row).toMatchObject({ netCents: 50_000, vatCents: 0, grossCents: 50_000 });
    });

    it('pozycja czekająca na kwotę ma same zera, a ilość co najmniej 1', () => {
        const row = toQuoteRow(leadItem({ priceGross: null, priceNet: null, totalGross: 0, quantity: 0 }));

        expect(row).toMatchObject({ quantity: 1, netCents: 0, vatCents: 0, grossCents: 0 });
    });
});

describe('toQuoteRows', () => {
    it('rozpisuje tylko pozycje przyjęte', () => {
        const rows = toQuoteRows([leadItem(), leadItem({ id: 'ai-1', status: 'SUGGESTED', source: 'AI' })]);

        expect(rows.map(r => r.id)).toEqual(['item-1']);
    });
});

describe('totalGrossOf', () => {
    it('sumuje brutto po rabatach z dokładnego brutto bazowego', () => {
        const lines = [
            line(),
            line({ id: 'line-2', adjustment: { type: 'FIXED_GROSS', value: 10_000 } }),
            line({ id: 'line-3', basePriceNet: 10_000, basePriceGross: undefined }),
        ];

        expect(totalGrossOf(lines)).toBe(190_000 + 180_000 + 12_300);
    });

    it('to ta sama liczba, którą wysyła toLeadInputs', () => {
        const lines = [line(), line({ id: 'line-2', adjustment: { type: 'PERCENT', value: -10 } })];

        expect(totalGrossOf(lines)).toBe(toLeadInputs(lines).reduce((sum, i) => sum + (i.priceGross ?? 0), 0));
    });

    it('pusta wycena to zero', () => {
        expect(totalGrossOf([])).toBe(0);
    });
});
