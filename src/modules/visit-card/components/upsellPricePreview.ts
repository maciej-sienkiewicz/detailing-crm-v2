// src/modules/visit-card/components/upsellPricePreview.ts
//
// Cena sugerowanej usługi, zanim trafi na serwer - ta sama liczba, którą policzy
// VisitUpsellAdminService silnikiem pozycji wizyty (PriceCalculator) z DOKŁADNYM brutto
// z cennika.
//
// Podgląd liczył wcześniej brutto z netta usługi. Przejście brutto → netto → brutto nie
// jest tożsamością (CLAUDE.md §1), więc usługa z cennika za 1900,00 zł pokazywała się
// jako 1900,01 zł, przekreślona „stara cena" też była 1900,01, a upust brutto 100,00 zł
// schodził z odtworzonej bazy: 1800,01 zamiast 1800,00, które zapisze serwer.
import { applyAdjustment, netToGross, type PriceAdjustment } from '@/common/utils/priceAdjustment';

export interface UpsellPricePreview {
    /** Cena z cennika brutto - dokładnie ta, którą widzi klient bez rabatu. */
    originalGrossCents: number;
    finalNetCents: number;
    finalGrossCents: number;
    /**
     * Klient zobaczy inną kwotę niż w cenniku. Porównujemy brutto, tak jak wiersz zapisanej
     * sugestii (originalPriceGross ≠ finalPriceGross): przekreślona cena w podglądzie ma się
     * pokazać dokładnie wtedy, gdy pokaże się po zapisaniu.
     */
    hasDiscount: boolean;
}

const NO_ADJUSTMENT: PriceAdjustment = { type: 'PERCENT', value: 0 };

/**
 * Rabat w postaci, w jakiej zapisze go serwer: procent w punktach bazowych, czyli
 * z dokładnością do setnej (AdjustmentType.convertPercentValueToBasisPoints). Bez tego
 * wpisane „10,123%" dawało w podglądzie inną cenę niż ta, którą klient dostanie.
 */
const asStoredByServer = (adjustment: PriceAdjustment): PriceAdjustment =>
    adjustment.type === 'PERCENT'
        ? { type: 'PERCENT', value: Math.round(adjustment.value * 100) / 100 }
        : adjustment;

/**
 * Podgląd ceny sugestii: brutto z cennika wchodzi do wyceny wprost, więc rabat zerowy,
 * „ustaw brutto" i upust brutto niosą dokładną kwotę, a brutto liczy się z netta tylko
 * po rabacie od netta (procent, upust netto, ustaw netto).
 *
 * @param adjustment rabat z formularza; brak = cena z cennika (serwer przyjmuje wtedy
 *                   PERCENT 0, czyli to samo).
 */
export const upsellPricePreview = (
    service: { basePriceNet: number; basePriceGross?: number | null; vatRate: number },
    adjustment?: PriceAdjustment,
): UpsellPricePreview => {
    // Usługa bez zapisanego brutto (dane sprzed jego wprowadzenia) - dopiero wtedy liczymy.
    const originalGrossCents = service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate);
    const { finalNetCents, finalGrossCents } = applyAdjustment(
        service.basePriceNet,
        service.vatRate,
        asStoredByServer(adjustment ?? NO_ADJUSTMENT),
        originalGrossCents,
    );
    return {
        originalGrossCents,
        finalNetCents,
        finalGrossCents,
        hasDiscount: finalGrossCents !== originalGrossCents,
    };
};
