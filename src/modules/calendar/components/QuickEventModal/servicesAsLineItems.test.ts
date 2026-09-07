// Regresja z produkcji: usługa dodana do wizyty w QuickEventModal z ceną brutto 1900,00 zł
// (23% VAT) pokazywała się w tabeli usług jako 1900,01 zł. Ustawienia → Usługi tego problemu
// nie miały, bo tamten ekran zawsze niesie basePriceGross razem z basePriceNet - ten budowniczy
// linii wyceny liczył kiedyś tylko basePriceNet, więc ServicesTable musiało samo odtworzyć
// brutto z netta (netToGross), a to przeliczenie nie jest tożsamością na siatce groszy
// (1900,00 zł → 1544,72 zł netto → odtworzone 1900,01 zł).
import { describe, expect, it } from 'vitest';
import { buildServicesAsLineItems, type ServicesAsLineItemsInput } from './servicesAsLineItems';

const baseInput = (overrides: Partial<ServicesAsLineItemsInput> = {}): ServicesAsLineItemsInput => ({
  selectedServiceIds: ['line-1'],
  serviceRefs: {},
  services: [],
  tempServices: {},
  servicePrices: {},
  serviceAdjustments: {},
  serviceNotes: {},
  serviceVatRates: {},
  ...overrides,
});

describe('buildServicesAsLineItems - basePriceGross', () => {
  it('usługa katalogowa niesie dokładne brutto 1900,00 zł, nie odtworzone 1900,01', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [
        { id: 'catalog-1', name: 'test', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false },
      ],
      servicePrices: { 'line-1': 1900 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items).toHaveLength(1);
    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[0].basePriceNet).toBe(154_472);
  });

  it('usługa niestandardowa (temp, bez serviceId w katalogu) też niesie dokładne brutto', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'temp-1' },
      tempServices: { 'temp-1': { name: 'Nowa usługa', basePriceNet: 154_472, vatRate: 23 } },
      servicePrices: { 'line-1': 1900 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[0].serviceId).toBe('temp-1');
  });

  it('grosze są zaokrąglane, nie ucinane', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 0, vatRate: 23, requireManualPrice: false }],
      servicePrices: { 'line-1': 1900.005 },
    });

    expect(buildServicesAsLineItems(input)[0].basePriceGross).toBe(190_001);
  });

  it('kilka pozycji naraz - każda niesie swoje własne dokładne brutto', () => {
    const input = baseInput({
      selectedServiceIds: ['line-1', 'line-2'],
      serviceRefs: { 'line-1': 'catalog-1', 'line-2': 'catalog-2' },
      services: [
        { id: 'catalog-1', name: 'A', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false },
        { id: 'catalog-2', name: 'B', basePriceNet: 8_102, vatRate: 8, requireManualPrice: false },
      ],
      servicePrices: { 'line-1': 1900, 'line-2': 87.5 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[1].basePriceGross).toBe(8_750);
  });

  it('brak ceny w servicePrices daje brutto 0, nie undefined ani NaN', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 100_000, vatRate: 23, requireManualPrice: false }],
    });

    expect(buildServicesAsLineItems(input)[0].basePriceGross).toBe(0);
  });

  it('pozycja bez dopasowanej usługi (skasowana z katalogu, brak w temp) jest pomijana', () => {
    const input = baseInput({ serviceRefs: { 'line-1': 'nieistniejace-id' } });

    expect(buildServicesAsLineItems(input)).toEqual([]);
  });

  it('stawka VAT z serviceVatRates ma pierwszeństwo nad stawką z katalogu przy liczeniu netta', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false }],
      serviceVatRates: { 'line-1': 8 },
      servicePrices: { 'line-1': 1900 },
    });

    const item = buildServicesAsLineItems(input)[0];
    expect(item.vatRate).toBe(8);
    // netto liczone od WYBRANEJ (8%) stawki, nie od katalogowej (23%).
    expect(item.basePriceNet).toBe(Math.round((1900 / 1.08) * 100));
    // brutto zostaje dokładnie tym, co wpisano - niezależnie od stawki użytej do netta.
    expect(item.basePriceGross).toBe(190_000);
  });
});
