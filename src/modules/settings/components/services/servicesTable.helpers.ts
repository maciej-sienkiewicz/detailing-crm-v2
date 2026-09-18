// src/modules/settings/components/services/servicesTable.helpers.ts
import { formatMoneyAmount } from '@/modules/services/utils/priceCalculator';
import type { VatRate } from '@/modules/services/types';

/**
 * Shared column template: header, skeleton and data rows must all use it.
 *
 * Kolumny VAT i STATUS zniknęły z siatki. VAT jest przy 23% na prawie każdej pozycji,
 * więc osobna kolumna z kolorową pigułką była jednolitą tapetą — zszedł do szarego
 * dopisku przy cenie i barwi się dopiero przy stawce innej niż podstawowa. Status
 * pojawia się WARUNKOWO: lista domyślnie pokazuje same aktywne, więc kolumna była
 * w całości zielona; wraca dopiero razem z archiwalnymi, które ma odróżniać.
 */
export const SERVICES_TABLE_GRID = 'minmax(0, 1fr) 170px 72px';

/** Wariant z widocznymi archiwalnymi — dochodzi kolumna statusu. */
export const SERVICES_TABLE_GRID_WITH_STATUS = 'minmax(0, 1fr) 170px 104px 72px';

export const formatPLN = (grosze: number): string => {
    const formatted = formatMoneyAmount(grosze);
    return `${parseFloat(formatted).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} zł`;
};

export const vatLabel = (rate: VatRate): string => (rate === -1 ? 'zw.' : `${rate}%`);
