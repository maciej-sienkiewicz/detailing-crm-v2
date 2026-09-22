import { describe, it, expect } from 'vitest';
import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import type { PriceAdjustment } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '../types';
import {
    bulkDiscountPlan, bulkVatEdits, buildServicesChangesPayload, currentPrice, draftRowGross,
    editFromEditor, editedPrice, editorAdjustment, editorPrefill, editorPreview, formatZlField,
    grossFieldFor, isCatalogPricedRow, linePrice, netFieldFor, parseZlCents, previewSide, pricedLine,
    restoreListPrice, visitTotals, withEditedPrice,
} from './servicePriceEdits';
import type { DraftPriceRow, EditedPrice, PricedLine } from './servicePriceEdits';

/*
 * 1900,00 zł brutto przy 23% VAT: netto 154472 gr. Z tego netta brutto wychodzi
 * 190001 gr (154472 × 1,23 = 190000,56) - kwota 1900,00 zł jest „od netta"
 * nieosiągalna, więc każde miejsce, które ją odtwarza, pokazuje 1900,01 zł.
 */
const NET = 154472;
const GROSS = 190000;
const NO_ADJ: PriceAdjustment = { type: 'PERCENT', value: 0 };

type Line = PricedLine & { id: string };

const exactLine = (extra: Partial<Line> = {}): Line => ({
    id: 'exact', basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS, finalPriceGross: GROSS, ...extra,
});
const catalogLine = (extra: Partial<Line> = {}): Line => ({
    id: 'catalog', basePriceNet: 100000, vatRate: 23, adjustment: NO_ADJ, basePriceGross: 123000, finalPriceGross: 123000, ...extra,
});
const manualGrossLine = (extra: Partial<Line> = {}): Line => ({
    id: 'manual', basePriceNet: 0, vatRate: 23, adjustment: { type: 'SET_GROSS', value: GROSS }, basePriceGross: null, finalPriceGross: GROSS, ...extra,
});

const visitLine = (extra: Partial<ServiceLineItem> = {}): ServiceLineItem => ({
    id: 'line-1',
    serviceId: 'svc-1',
    serviceName: 'Powłoka ceramiczna',
    basePriceNet: NET,
    vatRate: 23,
    requireManualPrice: false,
    adjustment: NO_ADJ,
    note: '',
    finalPriceNet: NET,
    finalPriceGross: GROSS,
    status: 'CONFIRMED' as ServiceLineItem['status'],
    basePriceGross: GROSS,
    ...extra,
});

const draftRow = (extra: Partial<DraftPriceRow> = {}): DraftPriceRow => ({
    serviceId: null, serviceName: 'Usługa spoza cennika', basePriceNet: NET, basePriceGross: GROSS,
    vatRate: 23, requireManualPrice: true, adjustment: { type: 'FIXED_NET', value: 0 }, ...extra,
});

// ─── Ceny pozycji ─────────────────────────────────────────────────────────────

describe('linePrice / editedPrice / currentPrice', () => {
    it('pozycja z dokładnym brutto bez rabatu kosztuje 1900,00 zł, nie 1900,01 zł', () => {
        expect(linePrice(exactLine())).toEqual({ finalNetCents: NET, finalGrossCents: GROSS, originalGrossCents: GROSS });
    });

    it('bez basePriceGross dokładne brutto przychodzi z finalPriceGross serwera (rabat zerowy)', () => {
        expect(linePrice(exactLine({ basePriceGross: null })).finalGrossCents).toBe(GROSS);
    });

    it('rabat od netta liczy brutto z netta końcowego', () => {
        const p = linePrice(exactLine({ adjustment: { type: 'PERCENT', value: -10 }, finalPriceGross: null }));
        expect(p.finalNetCents).toBe(139025);
        expect(p.finalGrossCents).toBe(netToGross(139025, 23));
        expect(p.originalGrossCents).toBe(GROSS);
    });

    it('upust brutto schodzi z dokładnego brutto', () => {
        const p = linePrice(exactLine({ adjustment: { type: 'FIXED_GROSS', value: 10000 }, finalPriceGross: 180000 }));
        expect(p.finalGrossCents).toBe(180000);
    });

    it('zmiana z dokładnym brutto daje dokładną kwotę; bez niego - liczoną z netta', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS };
        expect(editedPrice(ep).finalGrossCents).toBe(GROSS);
        expect(editedPrice({ ...ep, basePriceGross: undefined }).finalGrossCents).toBe(190001);
    });

    it('currentPrice bierze zmianę, gdy czeka na zapis', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 23, adjustment: { type: 'SET_GROSS', value: 150000 } };
        expect(currentPrice(exactLine(), ep).finalGrossCents).toBe(150000);
        expect(currentPrice(exactLine()).finalGrossCents).toBe(GROSS);
    });

    it('pricedLine zamienia null-e widoku bez cen na liczby', () => {
        const p = pricedLine({ basePriceNet: null, vatRate: null, adjustment: null, basePriceGross: undefined, finalPriceGross: null });
        expect(p).toEqual({ basePriceNet: 0, vatRate: 23, adjustment: NO_ADJ, basePriceGross: null, finalPriceGross: null });
    });
});

describe('withEditedPrice', () => {
    it('bez zmiany zwraca pozycję bez zmian', () => {
        const s = visitLine();
        expect(withEditedPrice(s, undefined)).toBe(s);
    });

    it('po zmianie kasuje brutto serwera i STARE dokładne brutto bazowe', () => {
        const s = visitLine();
        const shown = withEditedPrice(s, { basePriceNet: 100000, vatRate: 8, adjustment: NO_ADJ });
        expect(shown.finalPriceGross).toBeNull();
        expect(shown.basePriceGross).toBeNull();
        expect(shown.basePriceNet).toBe(100000);
        expect(shown.vatRate).toBe(8);
    });

    it('dokładne brutto niesione przez zmianę zostaje', () => {
        const shown = withEditedPrice(visitLine(), { basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS });
        expect(shown.basePriceGross).toBe(GROSS);
    });
});

// ─── Pola kwot ────────────────────────────────────────────────────────────────

describe('pola kwot edytora', () => {
    it('parseZlCents: przecinek i kropka, grosze bez błędów float', () => {
        expect(parseZlCents('1900,00')).toBe(190000);
        expect(parseZlCents('1544.72')).toBe(154472);
        expect(parseZlCents('0.29')).toBe(29);
        expect(parseZlCents('')).toBeNull();
        expect(parseZlCents('abc')).toBeNull();
        expect(parseZlCents('-5')).toBeNull();
    });

    it('formatZlField', () => {
        expect(formatZlField(190000)).toBe('1900.00');
        expect(formatZlField(154472)).toBe('1544.72');
        expect(formatZlField(5)).toBe('0.05');
    });

    it('wpisane brutto 1900,00 daje netto 1544,72', () => {
        expect(netFieldFor('1900,00', 23)).toBe('1544.72');
        expect(netFieldFor('x', 23)).toBeNull();
    });

    it('wpisane netto liczy brutto z netta (tu wolno)', () => {
        expect(grossFieldFor('1544.72', 23)).toBe('1900.01');
        expect(grossFieldFor('1000', 23)).toBe('1230.00');
        expect(grossFieldFor('1000', -1)).toBe('1000.00');
    });

    it('przeliczenie groszowe, nie na złotówkach we floatach', () => {
        // 1544,72 × 1,23 = 1900,0056 w float - ale w groszach 154472 + round(35528,56) = 190001.
        expect(grossFieldFor('1544.72', 23)).toBe(formatZlField(netToGross(154472, 23)));
    });
});

// ─── Okno „Cena usługi" ───────────────────────────────────────────────────────

describe('editorPrefill', () => {
    it('otwiera pozycję 1900,00 zł jako 1900,00 zł (regresja: było 1900,01)', () => {
        const prefill = editorPrefill(exactLine());
        expect(prefill.grossCents).toBe(GROSS);
        expect(prefill.netCents).toBe(NET);
        expect(prefill.vatRate).toBe(23);
        expect(prefill.lastField).toBe('gross');
    });

    it('cena ustalona od netta zachowuje przy zmianie stawki netto', () => {
        expect(editorPrefill(exactLine({ adjustment: { type: 'SET_NET', value: 100000 } })).lastField).toBe('net');
        expect(editorPrefill(exactLine({ adjustment: { type: 'PERCENT', value: -10 } })).lastField).toBe('net');
    });

    it('pozycja z cennika, której strony nie da się ustalić, zachowuje brutto - jak dotąd', () => {
        expect(editorPrefill(catalogLine()).lastField).toBe('gross');
    });

    it('niezapisana zmiana wygrywa z pozycją', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 8, adjustment: { type: 'SET_GROSS', value: 150000 } };
        expect(editorPrefill(exactLine(), ep)).toEqual({
            netCents: grossToNet(150000, 8), grossCents: 150000, vatRate: 8, lastField: 'gross',
        });
    });

    it('cena ręczna wpisana jako brutto otwiera się jako to brutto', () => {
        expect(editorPrefill(manualGrossLine()).grossCents).toBe(GROSS);
    });
});

describe('editorAdjustment', () => {
    const base = { mode: 'SET' as const, discountType: 'PERCENT' as const, discount: '', net: '1544.72', gross: '1900.00' };

    it('cena wpisana od brutto jedzie jako SET_GROSS z dokładną kwotą', () => {
        expect(editorAdjustment({ ...base, lastField: 'gross' })).toEqual({ type: 'SET_GROSS', value: 190000 });
    });

    it('cena wpisana od netta jedzie jako SET_NET', () => {
        expect(editorAdjustment({ ...base, lastField: 'net' })).toEqual({ type: 'SET_NET', value: 154472 });
    });

    it('puste brutto przy stronie brutto spada na netto', () => {
        expect(editorAdjustment({ ...base, gross: '', lastField: 'gross' })).toEqual({ type: 'SET_NET', value: 154472 });
    });

    it('rabat procentowy jest ujemny, kwotowy w groszach', () => {
        expect(editorAdjustment({ ...base, mode: 'DISCOUNT', discountType: 'PERCENT', discount: '10', lastField: 'gross' }))
            .toEqual({ type: 'PERCENT', value: -10 });
        expect(editorAdjustment({ ...base, mode: 'DISCOUNT', discountType: 'FIXED_GROSS', discount: '100,50', lastField: 'gross' }))
            .toEqual({ type: 'FIXED_GROSS', value: 10050 });
        expect(editorAdjustment({ ...base, mode: 'DISCOUNT', discountType: 'FIXED_NET', discount: '', lastField: 'gross' }))
            .toEqual({ type: 'FIXED_NET', value: 0 });
    });
});

describe('editorPreview', () => {
    it('„Kwota brutto" 100 zł od 1900,00 zł daje 1800,00 zł (regresja: było 1800,01)', () => {
        const p = editorPreview(exactLine(), 23, { type: 'FIXED_GROSS', value: 10000 });
        expect(p.finalGrossCents).toBe(180000);
        expect(p.listGross).toBe(GROSS);
        expect(p.savedGross).toBe(10000);
    });

    it('„Cena z cennika" pokazuje dokładne brutto', () => {
        expect(editorPreview(exactLine(), 23, NO_ADJ).listGross).toBe(GROSS);
    });

    it('po zmianie stawki baza liczy się z netta - jak na serwerze', () => {
        const p = editorPreview(exactLine(), 8, NO_ADJ);
        expect(p.listGross).toBe(netToGross(NET, 8));
        expect(p.finalGrossCents).toBe(netToGross(NET, 8));
    });

    it('cena ręczna: bazą jest kwota ustalona z klientem', () => {
        const p = editorPreview(manualGrossLine(), 23, { type: 'FIXED_GROSS', value: 10000 });
        expect(p.listGross).toBe(GROSS);
        expect(p.finalGrossCents).toBe(180000);
    });

    it('rabat od netta: brutto z netta końcowego', () => {
        const p = editorPreview(exactLine(), 23, { type: 'PERCENT', value: -10 });
        expect(p.finalNetCents).toBe(139025);
        expect(p.finalGrossCents).toBe(netToGross(139025, 23));
    });
});

describe('previewSide', () => {
    it('po rabacie od netta ustalone jest netto', () => {
        expect(previewSide(exactLine(), 23, { type: 'PERCENT', value: -10 })).toBe('net');
        expect(previewSide(exactLine(), 23, { type: 'FIXED_NET', value: 1000 })).toBe('net');
    });

    it('po upuście brutto ustalone jest brutto', () => {
        expect(previewSide(exactLine(), 23, { type: 'FIXED_GROSS', value: 1000 })).toBe('gross');
    });

    it('bez rabatu: brutto wpisane od strony brutto', () => {
        expect(previewSide(exactLine(), 23, NO_ADJ)).toBe('gross');
    });
});

describe('editFromEditor / restoreListPrice', () => {
    it('zmiana niesie dokładne brutto bazy, gdy stawka się nie zmieniła', () => {
        expect(editFromEditor(exactLine(), 23, { type: 'FIXED_GROSS', value: 10000 })).toEqual({
            basePriceNet: NET, vatRate: 23, adjustment: { type: 'FIXED_GROSS', value: 10000 }, basePriceGross: GROSS,
        });
    });

    it('po zmianie stawki dokładne brutto bazy przestaje obowiązywać', () => {
        expect(editFromEditor(exactLine(), 8, NO_ADJ).basePriceGross).toBeUndefined();
    });

    it('cena ręczna: baza z kwoty ustalonej, para mieści się w ±1 gr (serwer ją przyjmie)', () => {
        const ep = editFromEditor(manualGrossLine(), 23, { type: 'PERCENT', value: -10 });
        expect(ep.basePriceNet).toBe(grossToNet(GROSS, 23));
        expect(ep.basePriceGross).toBe(GROSS);
        expect(Math.abs(netToGross(ep.basePriceNet, 23) - ep.basePriceGross!)).toBeLessThanOrEqual(1);
    });

    it('„Przywróć cenę z cennika" wraca do 1900,00 zł, nie 1900,01 zł', () => {
        const ep = restoreListPrice(exactLine({ adjustment: { type: 'PERCENT', value: -10 } }));
        expect(ep).toEqual({ basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS });
        expect(editedPrice(ep).finalGrossCents).toBe(GROSS);
    });

    it('„Przywróć cenę z cennika" przy cenie ręcznej zostawia kwotę ustaloną z klientem', () => {
        expect(editedPrice(restoreListPrice(manualGrossLine())).finalGrossCents).toBe(GROSS);
    });
});

// ─── Operacje zbiorcze ────────────────────────────────────────────────────────

describe('bulkVatEdits', () => {
    it('pozycja z tą samą stawką zostaje nietknięta (regresja: dostawała SET_NET i 1900,01)', () => {
        expect(bulkVatEdits([exactLine()], {}, 23)).toEqual({});
    });

    it('brutto wpisane od strony brutto przechodzi przez zmianę stawki', () => {
        expect(bulkVatEdits([exactLine()], {}, 8).exact).toEqual({
            basePriceNet: NET, vatRate: 8, adjustment: { type: 'SET_GROSS', value: GROSS },
        });
    });

    it('pozycja z cennika, której strony nie da się ustalić, zachowuje netto - jak dotąd', () => {
        expect(bulkVatEdits([catalogLine()], {}, 8).catalog.adjustment).toEqual({ type: 'SET_NET', value: 100000 });
    });

    it('rabat od netta: zostaje netto końcowe', () => {
        const edits = bulkVatEdits([exactLine({ adjustment: { type: 'PERCENT', value: -10 } })], {}, 8);
        expect(edits.exact.adjustment).toEqual({ type: 'SET_NET', value: 139025 });
    });

    it('niezapisana zmiana SET_GROSS zachowuje swoje brutto', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 23, adjustment: { type: 'SET_GROSS', value: 150000 } };
        expect(bulkVatEdits([exactLine()], { exact: ep }, 5).exact.adjustment).toEqual({ type: 'SET_GROSS', value: 150000 });
    });

    it('niezapisana zmiana z docelową stawką zostaje, jak była', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 8, adjustment: { type: 'SET_NET', value: 100000 } };
        expect(bulkVatEdits([exactLine()], { exact: ep }, 8).exact).toBe(ep);
    });
});

describe('bulkDiscountPlan', () => {
    it('„Nadpisz zmiany": upust brutto od 1900,00 zł daje 1800,00 zł i wysyła dokładne brutto bazy', () => {
        const plan = bulkDiscountPlan([exactLine()], {}, 'FIXED_GROSS', 10000, false);
        expect(plan.edits.exact).toEqual({
            basePriceNet: NET, vatRate: 23, adjustment: { type: 'FIXED_GROSS', value: 10000 }, basePriceGross: GROSS,
        });
        expect(plan.rows[0]).toEqual({ id: 'exact', beforeNet: NET, beforeGross: GROSS, afterNet: grossToNet(180000, 23), afterGross: 180000 });
    });

    it('„Nadpisz zmiany": cena ręczna nie znika pod rabatem i zachowuje dokładne brutto', () => {
        const plan = bulkDiscountPlan([manualGrossLine()], {}, 'PERCENT', 10, false);
        expect(plan.edits.manual.basePriceNet).toBe(grossToNet(GROSS, 23));
        expect(plan.edits.manual.basePriceGross).toBe(GROSS);
        expect(plan.rows[0].beforeGross).toBe(GROSS);
        expect(plan.rows[0].afterNet).toBe(grossToNet(GROSS, 23) - Math.round(grossToNet(GROSS, 23) / 10));
    });

    it('„Uwzględnij poprawki": upust brutto zapisuje SET_GROSS, a nie SET_NET (regresja: 1799,99)', () => {
        const ep: EditedPrice = { basePriceNet: NET, vatRate: 23, adjustment: { type: 'SET_GROSS', value: GROSS } };
        const plan = bulkDiscountPlan([exactLine()], { exact: ep }, 'FIXED_GROSS', 10000, true);
        expect(plan.edits.exact.adjustment).toEqual({ type: 'SET_GROSS', value: 180000 });
        expect(plan.edits.exact.basePriceNet).toBe(NET); // baza z cennika zostaje
        expect(plan.edits.exact.basePriceGross).toBe(GROSS);
        expect(editedPrice(plan.edits.exact).finalGrossCents).toBe(180000);
    });

    it('„Uwzględnij poprawki": pozycja z zerowym udziałem w rabacie zachowuje dokładne brutto', () => {
        // Upust netto 1 gr rozkłada się na dwie pozycje: pierwsza dostaje 0 gr.
        const plan = bulkDiscountPlan([exactLine(), catalogLine({ id: 'big', basePriceNet: 10_000_000, basePriceGross: 12_300_000 })], {}, 'FIXED_NET', 1, true);
        expect(plan.rows[0].afterGross).toBe(GROSS);
        expect(plan.edits.exact.adjustment).toEqual({ type: 'SET_GROSS', value: GROSS });
        expect(editedPrice(plan.edits.exact).finalGrossCents).toBe(GROSS);
    });

    it('„Uwzględnij poprawki": rabat procentowy zapisuje netto końcowe', () => {
        const plan = bulkDiscountPlan([catalogLine()], {}, 'PERCENT', 10, true);
        expect(plan.edits.catalog.adjustment).toEqual({ type: 'SET_NET', value: 90000 });
    });

    it('podgląd i zapis to te same kwoty', () => {
        const lines = [exactLine(), catalogLine(), manualGrossLine()];
        for (const useEdited of [false, true]) {
            for (const [type, value] of [['PERCENT', 10], ['FIXED_NET', 5000], ['FIXED_GROSS', 5000], ['SET_NET', 300000], ['SET_GROSS', 400000]] as const) {
                const plan = bulkDiscountPlan(lines, {}, type, value, useEdited);
                plan.rows.forEach(row => {
                    expect(editedPrice(plan.edits[row.id]).finalGrossCents).toBe(row.afterGross);
                    expect(editedPrice(plan.edits[row.id]).finalNetCents).toBe(row.afterNet);
                });
            }
        }
    });

    it('bez wartości rabatu: sam podgląd, żadnych zmian', () => {
        const plan = bulkDiscountPlan([exactLine()], {}, 'PERCENT', null, false);
        expect(plan.edits).toEqual({});
        expect(plan.rows[0]).toEqual({ id: 'exact', beforeNet: NET, beforeGross: GROSS, afterNet: NET, afterGross: GROSS });
    });

    it('„Łącznie przed rabatem" sumuje dokładne brutto', () => {
        const plan = bulkDiscountPlan([exactLine(), exactLine({ id: 'second' })], {}, 'PERCENT', null, false);
        expect(plan.rows.reduce((s, r) => s + r.beforeGross, 0)).toBe(380000);
    });
});

// ─── Sumy i zapis ─────────────────────────────────────────────────────────────

describe('visitTotals', () => {
    it('„Razem" z dokładnym brutto pozycji, zmian i nowych wierszy; VAT to różnica', () => {
        const services = [visitLine({ id: 'a' }), visitLine({ id: 'b' })];
        const editedPrices = { b: { basePriceNet: NET, vatRate: 23, adjustment: { type: 'FIXED_GROSS', value: 10000 }, basePriceGross: GROSS } as EditedPrice };
        const totals = visitTotals({ services, editedPrices, newRows: [draftRow()], deletedIds: new Set() });
        expect(totals.totalFinalGross).toBe(GROSS + 180000 + GROSS);
        expect(totals.totalVat).toBe(totals.totalFinalGross - totals.totalFinalNet);
        expect(totals.totalDiscountGross).toBe(10000);
        expect(totals.hasTotalDiscount).toBe(true);
        expect(totals.totalGrossBefore).toBe(2 * GROSS);
    });

    it('nowy wiersz z brutto wpisanym 1900,00 zł liczy się jako 1900,00 zł (regresja: 1900,01)', () => {
        const totals = visitTotals({ services: [], editedPrices: {}, newRows: [draftRow()], deletedIds: new Set() });
        expect(totals.totalFinalGross).toBe(GROSS);
    });

    it('wiersze bez nazwy pomija', () => {
        const totals = visitTotals({ services: [], editedPrices: {}, newRows: [draftRow({ serviceName: '  ' })], deletedIds: new Set() });
        expect(totals.totalFinalGross).toBe(0);
    });

    it('usunięta pozycja wypada z sumy, ale zostaje w stanie „przed"', () => {
        const totals = visitTotals({ services: [visitLine({ id: 'a' })], editedPrices: {}, newRows: [], deletedIds: new Set(['a']) });
        expect(totals.totalFinalGross).toBe(0);
        expect(totals.totalGrossBefore).toBe(GROSS);
    });

    it('pozycja czekająca na klienta liczy się poprzednią ceną', () => {
        const pending = visitLine({
            id: 'p', hasPendingChange: true, pendingOperation: 'EDIT', previousPriceNet: 100000, previousPriceGross: 123000,
            adjustment: { type: 'SET_GROSS', value: 150000 },
        });
        const totals = visitTotals({ services: [pending], editedPrices: {}, newRows: [], deletedIds: new Set() });
        expect(totals.totalFinalGross).toBe(123000);
        expect(totals.totalFinalNet).toBe(100000);
        expect(totals.totalGrossBefore).toBe(123000);
    });
});

describe('draftRowGross / isCatalogPricedRow', () => {
    it('brutto wiersza: dokładne, gdy jest; inaczej z netta', () => {
        expect(draftRowGross({ basePriceNet: NET, basePriceGross: GROSS, vatRate: 23 })).toBe(GROSS);
        expect(draftRowGross({ basePriceNet: NET, vatRate: 23 })).toBe(190001);
    });

    it('wiersz z cennika po cenie z cennika', () => {
        expect(isCatalogPricedRow({ serviceId: 'svc', requireManualPrice: false })).toBe(true);
        expect(isCatalogPricedRow({ serviceId: 'svc', requireManualPrice: true })).toBe(false);
        expect(isCatalogPricedRow({ serviceId: null, requireManualPrice: false })).toBe(false);
    });
});

describe('buildServicesChangesPayload', () => {
    const base = { editedPrices: {}, deletedIds: new Set<string>(), notifyCustomer: false, requireConfirmation: true };

    it('brutto wpisane w nowym wierszu jedzie do serwera (regresja: jechało samo netto)', () => {
        const payload = buildServicesChangesPayload({ ...base, newRows: [draftRow()] });
        expect(payload.added[0]).toMatchObject({ basePriceNet: NET, basePriceGross: GROSS, vatRate: 23 });
    });

    it('wiersz z cennika nie niesie brutto - serwer bierze je z katalogu', () => {
        const payload = buildServicesChangesPayload({
            ...base, newRows: [draftRow({ serviceId: 'svc', requireManualPrice: false })],
        });
        expect(payload.added[0]).not.toHaveProperty('basePriceGross');
    });

    it('wiersz z netto wpisanym ręcznie nie wymyśla brutto', () => {
        const payload = buildServicesChangesPayload({ ...base, newRows: [draftRow({ basePriceGross: undefined })] });
        expect(payload.added[0]).not.toHaveProperty('basePriceGross');
    });

    it('zmiana ceny niesie dokładne brutto bazy', () => {
        const payload = buildServicesChangesPayload({
            ...base, newRows: [],
            editedPrices: { 'line-1': { basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS } },
        });
        expect(payload.updated).toEqual([{ serviceLineItemId: 'line-1', basePriceNet: NET, vatRate: 23, adjustment: NO_ADJ, basePriceGross: GROSS }]);
    });

    it('zmiana bez dokładnego brutto go nie wysyła', () => {
        const payload = buildServicesChangesPayload({
            ...base, newRows: [],
            editedPrices: { 'line-1': { basePriceNet: NET, vatRate: 8, adjustment: { type: 'SET_NET', value: 1000 } } },
        });
        expect(payload.updated[0]).not.toHaveProperty('basePriceGross');
    });

    it('potwierdzenie klienta tylko przy SMS-ie; wiersze bez nazwy i usunięcia', () => {
        const payload = buildServicesChangesPayload({
            ...base, newRows: [draftRow({ serviceName: ' ' })], deletedIds: new Set(['x']),
        });
        expect(payload.requireConfirmation).toBe(false);
        expect(payload.added).toEqual([]);
        expect(payload.deleted).toEqual([{ serviceLineItemId: 'x' }]);
        expect(buildServicesChangesPayload({ ...base, newRows: [], notifyCustomer: true }).requireConfirmation).toBe(true);
    });
});
