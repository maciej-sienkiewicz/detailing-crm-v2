// Regresja z produkcji: usługa dodana do wizyty w QuickEventModal z ceną brutto 1900,00 zł
// (23% VAT) pokazywała się w tabeli usług jako 1900,01 zł. Ustawienia → Usługi tego problemu
// nie miały, bo tamten ekran zawsze niesie basePriceGross razem z basePriceNet - ten budowniczy
// linii wyceny liczył kiedyś tylko basePriceNet, więc ServicesTable musiało samo odtworzyć
// brutto z netta (netToGross), a to przeliczenie nie jest tożsamością na siatce groszy
// (1900,00 zł → 1544,72 zł netto → odtworzone 1900,01 zł).
//
// Reguła biznesowa jest symetryczna: to, co użytkownik WPISAŁ - netto albo brutto - ma
// się nigdy nie zmienić, niezależnie od tego, którą wartość wpisał. `servicePrices`
// (brutto, złote) i `serviceBasePrices` (netto, grosze) są odtąd ustalane RAZEM, w jednym
// miejscu wejścia (dodanie usługi, utworzenie nowej, ręczna cena, edycja pozycji) i CZYTANE
// tu wprost, bez przeliczania jednej z drugiej - patrz komentarz w servicesAsLineItems.ts.
import { describe, expect, it } from 'vitest';
import { buildServicesAsLineItems, type ServicesAsLineItemsInput } from './servicesAsLineItems';

const baseInput = (overrides: Partial<ServicesAsLineItemsInput> = {}): ServicesAsLineItemsInput => ({
  selectedServiceIds: ['line-1'],
  serviceRefs: {},
  services: [],
  tempServices: {},
  servicePrices: {},
  serviceBasePrices: {},
  serviceAdjustments: {},
  serviceNotes: {},
  serviceVatRates: {},
  ...overrides,
});

describe('buildServicesAsLineItems - obie ceny sa dokladne, zadna nie jest przeliczana z drugiej', () => {
  it('brutto wpisane przez uzytkownika (1900,00 zl) zostaje dokladnie takie na ekranie', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [
        { id: 'catalog-1', name: 'test', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false },
      ],
      servicePrices: { 'line-1': 1900 },
      serviceBasePrices: { 'line-1': 154_472 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items).toHaveLength(1);
    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[0].basePriceNet).toBe(154_472);
  });

  it('netto wpisane przez uzytkownika zostaje dokladnie takie, nawet gdyby przeliczenie z brutto dalo cos innego', () => {
    // serviceBasePrices niesie WŁAŚNIE tę wartość, którą użytkownik wpisał jako netto -
    // dobrana tu celowo tak, żeby RÓŻNIŁA SIĘ od tego, co wyszłoby z przeliczenia
    // wstecz z brutto (1900 zł / 1,23 ≈ 1544,72 zł = 154472 gr). Test dowodzi, że
    // funkcja bierze wartość wprost ze `serviceBasePrices`, a nie przelicza jej sama -
    // niezależnie od tego, czy w danym konkretnym przypadku przeliczenie akurat by się
    // zgodziło, czy nie.
    const exactNetTypedByUser = 200_000; // 2000,00 zł - inna wartość niż przeliczenie dałoby
    const derivedIfRecomputed = Math.round((1900 / 1.23) * 100);
    expect(derivedIfRecomputed).not.toBe(exactNetTypedByUser);

    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: exactNetTypedByUser, vatRate: 23, requireManualPrice: false }],
      servicePrices: { 'line-1': 1900 },
      serviceBasePrices: { 'line-1': exactNetTypedByUser },
    });

    expect(buildServicesAsLineItems(input)[0].basePriceNet).toBe(exactNetTypedByUser);
  });

  it('usługa niestandardowa (temp, bez wpisu w katalogu) tez niesie dokladna pare netto/brutto', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'temp-1' },
      tempServices: { 'temp-1': { name: 'Nowa usługa', basePriceNet: 154_472, vatRate: 23 } },
      servicePrices: { 'line-1': 1900 },
      serviceBasePrices: { 'line-1': 154_472 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[0].basePriceNet).toBe(154_472);
    expect(items[0].serviceId).toBe('temp-1');
  });

  it('grosze brutto sa zaokraglane, nie ucinane', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 0, vatRate: 23, requireManualPrice: false }],
      servicePrices: { 'line-1': 1900.005 },
    });

    expect(buildServicesAsLineItems(input)[0].basePriceGross).toBe(190_001);
  });

  it('kilka pozycji naraz - kazda niesie swoja wlasna dokladna pare cen', () => {
    const input = baseInput({
      selectedServiceIds: ['line-1', 'line-2'],
      serviceRefs: { 'line-1': 'catalog-1', 'line-2': 'catalog-2' },
      services: [
        { id: 'catalog-1', name: 'A', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false },
        { id: 'catalog-2', name: 'B', basePriceNet: 8_102, vatRate: 8, requireManualPrice: false },
      ],
      servicePrices: { 'line-1': 1900, 'line-2': 87.5 },
      serviceBasePrices: { 'line-1': 154_472, 'line-2': 8_102 },
    });

    const items = buildServicesAsLineItems(input);

    expect(items[0].basePriceGross).toBe(190_000);
    expect(items[0].basePriceNet).toBe(154_472);
    expect(items[1].basePriceGross).toBe(8_750);
    expect(items[1].basePriceNet).toBe(8_102);
  });

  it('brak ceny w servicePrices daje brutto 0, nie undefined ani NaN', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 100_000, vatRate: 23, requireManualPrice: false }],
    });

    expect(buildServicesAsLineItems(input)[0].basePriceGross).toBe(0);
  });

  it('pozycja bez dopasowanej uslugi (skasowana z katalogu, brak w temp) jest pomijana', () => {
    const input = baseInput({ serviceRefs: { 'line-1': 'nieistniejace-id' } });

    expect(buildServicesAsLineItems(input)).toEqual([]);
  });

  it('stawka VAT z serviceVatRates ma pierwszenstwo nad stawka z katalogu - dotyczy tylko dopasowania stawki, nie netta', () => {
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 154_472, vatRate: 23, requireManualPrice: false }],
      serviceVatRates: { 'line-1': 8 },
      servicePrices: { 'line-1': 1900 },
      serviceBasePrices: { 'line-1': 154_472 },
    });

    const item = buildServicesAsLineItems(input)[0];
    expect(item.vatRate).toBe(8);
    // netto i brutto zostają dokładnie tym, co jest zapisane - stawka VAT z tabeli
    // wpływa na wyświetlaną etykietę VAT, nie na wartości cen.
    expect(item.basePriceNet).toBe(154_472);
    expect(item.basePriceGross).toBe(190_000);
  });

  it('bezpiecznik: gdy serviceBasePrices nie ma wpisu (stary zapisany draft), netto liczy sie ze wzoru VAT', () => {
    // Jedyny przypadek, w którym przeliczenie w ogóle się odbywa - dane sprzed tej
    // naprawy, gdzie serviceBasePrices nigdy nie zostało ustawione.
    const input = baseInput({
      serviceRefs: { 'line-1': 'catalog-1' },
      services: [{ id: 'catalog-1', name: 'x', basePriceNet: 999_999, vatRate: 23, requireManualPrice: false }],
      servicePrices: { 'line-1': 1900 },
      // serviceBasePrices celowo puste - symuluje stary draft.
    });

    expect(buildServicesAsLineItems(input)[0].basePriceNet).toBe(Math.round((1900 / 1.23) * 100));
  });
});
