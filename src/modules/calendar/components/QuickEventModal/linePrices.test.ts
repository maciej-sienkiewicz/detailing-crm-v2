// Ceny pozycji QuickEventModal w mapach formularza: przy dodaniu pozycji i po zmianie
// w tabeli usług. Reguła z CLAUDE.md §1: kwota wpisana przez człowieka nie jest liczona
// drugi raz - 1900,00 zł brutto przy 23% VAT to 154472 gr netto, a 154472 × 1,23 daje
// 190001 gr, więc brutto musi przejść jako 190000, a nie zostać odtworzone z netta.
//
// Dwie regresje z produkcji, których pilnuje ten plik:
//  - pozycja katalogowa z 8% VAT jechała do API z 23%, bo formularz nie zapisywał
//    stawki przy dodaniu pozycji (buildAppointmentPayload bierze ją z serviceVatRates);
//  - po zbiorczej zmianie VAT netto pozycji brało się z cennika, więc cena ręczna
//    (w cenniku 0 zł) spadała do zera.
import { describe, expect, it } from 'vitest';
import { netToGross, withVatRate } from '@/common/utils/priceAdjustment';
import { buildServicesAsLineItems, type ServicesAsLineItemsInput } from './servicesAsLineItems';
import { catalogLinePrices, formPricesFromLineItems, manualLinePrices } from './linePrices';
import type { Service } from './types';
import type { ServiceLineItem } from '@/common/components/ServicesTable';

const NET = 154_472;
const GROSS = 190_000;

describe('catalogLinePrices - pozycja z cennika', () => {
    it('brutto z cennika przechodzi dokładnie: 1900,00, nie 1900,01', () => {
        expect(catalogLinePrices({ basePriceNet: NET, basePriceGross: GROSS, vatRate: 23 }))
            .toEqual({ grossPln: 1900, netCents: NET, vatRate: 23 });
    });

    it('stawka z cennika (8%) wchodzi do formularza razem z ceną', () => {
        expect(catalogLinePrices({ basePriceNet: 10_000, basePriceGross: 10_800, vatRate: 8 }).vatRate).toBe(8);
    });

    it('bez brutta w cenniku brutto liczy się z netta wspólnym przeliczeniem', () => {
        expect(catalogLinePrices({ basePriceNet: NET, vatRate: 23 }).grossPln).toBe(1900.01);
        expect(catalogLinePrices({ basePriceNet: NET, basePriceGross: null, vatRate: 23 }).grossPln).toBe(1900.01);
    });

    it('ZW: brutto równa się netto (własny wzór liczył netto × 0,99)', () => {
        expect(catalogLinePrices({ basePriceNet: 10_000, vatRate: -1 })).toEqual({ grossPln: 100, netCents: 10_000, vatRate: -1 });
    });
});

describe('manualLinePrices - cena z okna „Wprowadź cenę"', () => {
    it('brutto wpisane w oknie zostaje dokładne', () => {
        expect(manualLinePrices({ priceNet: NET, priceGross: GROSS }, 23))
            .toEqual({ grossPln: 1900, netCents: NET, vatRate: 23 });
    });

    it('stawka 0% zostaje 0%, a nie zamienia się w 23%', () => {
        expect(manualLinePrices({ priceNet: 10_000, priceGross: 10_000 }, 0))
            .toEqual({ grossPln: 100, netCents: 10_000, vatRate: 0 });
    });

    it('usługa darmowa: 0 zł netto i brutto', () => {
        expect(manualLinePrices({ priceNet: 0, priceGross: 0 }, 23)).toEqual({ grossPln: 0, netCents: 0, vatRate: 23 });
    });
});

describe('formPricesFromLineItems - pozycje tabeli z powrotem do map formularza', () => {
    const line = (overrides: Partial<ServiceLineItem> = {}): ServiceLineItem => ({
        id: 'line-1',
        serviceId: 'svc-1',
        serviceName: 'Powłoka ceramiczna',
        basePriceNet: NET,
        basePriceGross: GROSS,
        vatRate: 23,
        adjustment: { type: 'PERCENT', value: 0 },
        ...overrides,
    });

    it('para z pozycji przechodzi bez przeliczania', () => {
        expect(formPricesFromLineItems([line()])).toEqual({
            serviceBasePrices: { 'line-1': NET },
            servicePrices: { 'line-1': 1900 },
            servicePriceInputs: { 'line-1': { net: '1544.72', gross: '1900.00' } },
        });
    });

    it('23% → 8% na cenie wpisanej od brutta: brutto 1900,00 zostaje, netto z pozycji', () => {
        const prices = formPricesFromLineItems([withVatRate(line(), 8)]);

        expect(prices.servicePrices['line-1']).toBe(1900);
        expect(prices.serviceBasePrices['line-1']).toBe(175_926);
    });

    it('pozycja bez brutta (zmiana stawki ceny z netta): netto z pozycji, brutto z netta przy nowej stawce', () => {
        const prices = formPricesFromLineItems([line({ basePriceNet: 10_000, basePriceGross: undefined, vatRate: 8 })]);

        expect(prices.serviceBasePrices['line-1']).toBe(10_000);
        expect(prices.servicePrices['line-1']).toBe(netToGross(10_000, 8) / 100);
    });
});

describe('QuickEventModal: tabela → formularz → tabela (bez Reacta)', () => {
    /** Usługa z ceną ręczną: w cenniku nie ma ceny, jest 0 zł. */
    const MANUAL: Service = { id: 'svc-manual', name: 'Wycena indywidualna', basePriceNet: 0, basePriceGross: 0, vatRate: 23, requireManualPrice: true };
    const CATALOG: Service = { id: 'svc-catalog', name: 'Powłoka ceramiczna', basePriceNet: NET, basePriceGross: GROSS, vatRate: 23, requireManualPrice: false };

    const formState = (): ServicesAsLineItemsInput => {
        const manual = manualLinePrices({ priceNet: 150_000, priceGross: netToGross(150_000, 23) }, 23);
        const catalog = catalogLinePrices(CATALOG);
        return {
            selectedServiceIds: ['line-manual', 'line-catalog'],
            serviceRefs: { 'line-manual': MANUAL.id, 'line-catalog': CATALOG.id },
            services: [MANUAL, CATALOG],
            tempServices: {},
            servicePrices: { 'line-manual': manual.grossPln, 'line-catalog': catalog.grossPln },
            serviceBasePrices: { 'line-manual': manual.netCents, 'line-catalog': catalog.netCents },
            serviceAdjustments: {},
            serviceNotes: {},
            serviceVatRates: { 'line-manual': manual.vatRate, 'line-catalog': catalog.vatRate },
        };
    };

    /** To, co robi handleServicesChange z listą oddaną przez tabelę. */
    const applyTableChange = (state: ServicesAsLineItemsInput, rate: number): ServicesAsLineItemsInput => {
        const changed = buildServicesAsLineItems(state).map(item => withVatRate(item, rate));
        const prices = formPricesFromLineItems(changed);
        return {
            ...state,
            servicePrices: prices.servicePrices,
            serviceBasePrices: prices.serviceBasePrices,
            serviceVatRates: Object.fromEntries(changed.map(item => [item.id, item.vatRate])),
        };
    };

    it('zbiorcza zmiana na 8%: cena ręczna zachowuje wpisane netto, a nie 0 zł z cennika', () => {
        const [manual, catalog] = buildServicesAsLineItems(applyTableChange(formState(), 8));

        expect(manual).toMatchObject({ basePriceNet: 150_000, basePriceGross: netToGross(150_000, 8), vatRate: 8 });
        expect(catalog).toMatchObject({ basePriceNet: 175_926, basePriceGross: GROSS, vatRate: 8 });
    });

    it('zbiorcza zmiana na tę samą stawkę nie rusza żadnej kwoty - 1900,00 zostaje', () => {
        const [, catalog] = buildServicesAsLineItems(applyTableChange(formState(), 23));

        expect(catalog).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, vatRate: 23 });
    });
});
