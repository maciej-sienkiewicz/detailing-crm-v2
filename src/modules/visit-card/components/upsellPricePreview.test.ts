// Podgląd ceny sugestii ma pokazać DOKŁADNIE to, co zapisze serwer (VisitUpsellAdminService
// liczy silnikiem pozycji wizyty z brutto katalogu). Regresja: usługa z cennika za 1900,00 zł
// brutto (154472 gr netto, 23%) pokazywała się w podglądzie jako 1900,01 zł, bo podgląd
// odtwarzał brutto z netta - a tej kwoty nie da się z netta w groszach uzyskać.
import { describe, expect, it } from 'vitest';
import { upsellPricePreview } from './upsellPricePreview';

/** Usługa z cennika wpisana jako 1900,00 zł brutto. */
const CATALOG_1900 = { basePriceNet: 154_472, basePriceGross: 190_000, vatRate: 23 };

describe('upsellPricePreview', () => {
    it('bez rabatu pokazuje brutto z cennika: 1900,00, nie 1900,01', () => {
        const preview = upsellPricePreview(CATALOG_1900);

        expect(preview.finalGrossCents).toBe(190_000);
        expect(preview.finalNetCents).toBe(154_472);
        expect(preview.originalGrossCents).toBe(190_000);
        expect(preview.hasDiscount).toBe(false);
    });

    it('rabat zerowy każdego rodzaju zostawia dokładne brutto z cennika', () => {
        expect(upsellPricePreview(CATALOG_1900, { type: 'PERCENT', value: 0 }).finalGrossCents).toBe(190_000);
        expect(upsellPricePreview(CATALOG_1900, { type: 'FIXED_NET', value: 0 }).finalGrossCents).toBe(190_000);
        expect(upsellPricePreview(CATALOG_1900, { type: 'FIXED_GROSS', value: 0 }).finalGrossCents).toBe(190_000);
    });

    it('„ustaw brutto" 1900,00 daje klientowi 1900,00, a netto liczy się „w stu"', () => {
        const preview = upsellPricePreview(
            { basePriceNet: 162_602, basePriceGross: 200_000, vatRate: 23 },
            { type: 'SET_GROSS', value: 190_000 },
        );

        expect(preview.finalGrossCents).toBe(190_000);
        expect(preview.finalNetCents).toBe(154_472);
        expect(preview.originalGrossCents).toBe(200_000);
        expect(preview.hasDiscount).toBe(true);
    });

    it('„ustaw brutto" równe cenie z cennika nie udaje obniżki', () => {
        const preview = upsellPricePreview(CATALOG_1900, { type: 'SET_GROSS', value: 190_000 });

        expect(preview.finalGrossCents).toBe(190_000);
        expect(preview.hasDiscount).toBe(false);
    });

    it('upust brutto 100,00 schodzi z dokładnego brutto z cennika: 1800,00, nie 1800,01', () => {
        const preview = upsellPricePreview(CATALOG_1900, { type: 'FIXED_GROSS', value: 10_000 });

        expect(preview.finalGrossCents).toBe(180_000);
        expect(preview.finalNetCents).toBe(146_341);
        expect(preview.originalGrossCents).toBe(190_000);
        expect(preview.hasDiscount).toBe(true);
    });

    it('rabat procentowy zmienia netto, więc brutto liczy się z netta końcowego', () => {
        const preview = upsellPricePreview(CATALOG_1900, { type: 'PERCENT', value: -10 });

        // 154472 − round(15447,2) = 139025; 139025 + round(31975,75) = 171001
        expect(preview.finalNetCents).toBe(139_025);
        expect(preview.finalGrossCents).toBe(171_001);
        // Przekreślona cena to brutto z cennika, a nie brutto odtworzone z netta.
        expect(preview.originalGrossCents).toBe(190_000);
        expect(preview.hasDiscount).toBe(true);
    });

    it('upust netto i „ustaw netto" też liczą brutto z netta końcowego', () => {
        expect(upsellPricePreview(CATALOG_1900, { type: 'FIXED_NET', value: 4_472 })).toMatchObject({
            finalNetCents: 150_000,
            finalGrossCents: 184_500,
        });
        expect(upsellPricePreview(CATALOG_1900, { type: 'SET_NET', value: 100_000 })).toMatchObject({
            finalNetCents: 100_000,
            finalGrossCents: 123_000,
        });
    });

    it('procent liczy z dokładnością do setnej, tak jak zapisze go serwer (punkty bazowe)', () => {
        // Serwer: round(10,123 × 100) = 1012 pb → 10,12%. Bez tego podgląd pokazywał
        // netto 138835 (10,123%), a klient dostawał 138839.
        const typed = upsellPricePreview(CATALOG_1900, { type: 'PERCENT', value: -10.123 });
        const stored = upsellPricePreview(CATALOG_1900, { type: 'PERCENT', value: -10.12 });

        expect(typed).toEqual(stored);
        expect(typed.finalNetCents).toBe(138_839);
    });

    it('procent, który po zaokrągleniu do setnej jest zerem, jest rabatem zerowym', () => {
        const preview = upsellPricePreview(CATALOG_1900, { type: 'PERCENT', value: -0.001 });

        expect(preview.finalGrossCents).toBe(190_000);
        expect(preview.hasDiscount).toBe(false);
    });

    it('usługa zwolniona (zw): netto = brutto, także po rabacie', () => {
        const exempt = { basePriceNet: 100_000, basePriceGross: 100_000, vatRate: -1 };

        expect(upsellPricePreview(exempt)).toMatchObject({ finalNetCents: 100_000, finalGrossCents: 100_000 });
        expect(upsellPricePreview(exempt, { type: 'SET_GROSS', value: 90_000 })).toMatchObject({
            finalNetCents: 90_000,
            finalGrossCents: 90_000,
        });
        expect(upsellPricePreview(exempt, { type: 'PERCENT', value: -10 })).toMatchObject({
            finalNetCents: 90_000,
            finalGrossCents: 90_000,
        });
    });

    it('usługa bez zapisanego brutto dopiero wtedy liczy je z netta', () => {
        const preview = upsellPricePreview({ basePriceNet: 10_000, basePriceGross: null, vatRate: 23 });

        expect(preview.originalGrossCents).toBe(12_300);
        expect(preview.finalGrossCents).toBe(12_300);
    });
});
