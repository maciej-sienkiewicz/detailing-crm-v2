// src/modules/settings/components/services/servicesTable.helpers.ts
import { catalogGross, formatMoneyAmount } from '@/modules/services/utils/priceCalculator';
import type { Service, VatRate } from '@/modules/services/types';
import type { PriceSide } from '@/common/utils/priceInputs';

/**
 * Siatka wiersza cennika na komputerze: nazwa → kwota główna → druga kwota z VAT → ⋮.
 * Nagłówek, szkielet i wiersze muszą stać na tej samej.
 *
 * Osobnej kolumny statusu nie ma: lista domyślnie pokazuje same aktywne, więc taka
 * kolumna była w całości „Aktywna". Archiwalna pozycja dostaje plakietkę przy nazwie.
 */
export const SERVICES_TABLE_GRID = 'minmax(0, 1fr) 150px 200px 36px';

export const formatPLN = (grosze: number): string => {
    const formatted = formatMoneyAmount(grosze);
    return `${parseFloat(formatted).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} zł`;
};

export const vatLabel = (rate: VatRate): string => (rate === -1 ? 'zw.' : `${rate}%`);

const SIDE_WORD: Record<PriceSide, string> = { gross: 'brutto', net: 'netto' };

export interface RowPriceTexts {
    /** Kwota główna - strona wybrana w „Ceny: Brutto | Netto"; `null` przy wycenie ręcznej. */
    main: string | null;
    /** Podpis pod kwotą główną: „brutto" / „netto". */
    mainCaption: string;
    /** Druga strona i stawka jednym zdaniem: „500,00 zł netto, VAT 23%". */
    secondary: string;
}

/**
 * Teksty ceny wiersza cennika.
 *
 * Brutto to brutto ZAPISANE przy usłudze (`catalogGross`), liczone z netta wyłącznie
 * wtedy, gdy zapisanego brak (CLAUDE.md §1): cena wpisana jako 1900,00 zł ma się tu
 * pokazać jako 1900,00 zł, a nie 1900,01 zł. Netto to `basePriceNet` wprost.
 *
 * Druga kwota i VAT są zdaniem z przecinkiem, nie ciągiem sklejonym kropką (§4) -
 * wcześniej „615,00 zł brutto · 23%" nie mówiło, czym jest „23%".
 */
export function rowPriceTexts(
    service: Pick<Service, 'basePriceNet' | 'basePriceGross' | 'vatRate' | 'requireManualPrice'>,
    side: PriceSide,
): RowPriceTexts {
    const vat = `VAT ${vatLabel(service.vatRate)}`;
    if (service.requireManualPrice) {
        return { main: null, mainCaption: '', secondary: vat };
    }
    const amounts: Record<PriceSide, number> = {
        gross: catalogGross(service),
        net: service.basePriceNet,
    };
    const other: PriceSide = side === 'gross' ? 'net' : 'gross';
    return {
        main: formatPLN(amounts[side]),
        mainCaption: SIDE_WORD[side],
        secondary: `${formatPLN(amounts[other])} ${SIDE_WORD[other]}, ${vat}`,
    };
}

/** Linijka pod nazwą pakietu: zdanie z przecinkami zamiast „A · B · C" (CLAUDE.md §4). */
export function packageItemsSentence(service: Pick<Service, 'packageItems'>): string | null {
    const names = (service.packageItems ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(i => i.serviceName)
        .filter(Boolean);
    if (names.length === 0) return null;
    return `W pakiecie: ${names.join(', ')}`;
}

/** Linijka pod nazwą usługi z przypiętymi instrukcjami pielęgnacji. */
export function careSentence(titles: string[]): string | null {
    if (titles.length === 0) return null;
    return `${titles.length === 1 ? 'Instrukcja' : 'Instrukcje'}: ${titles.join(', ')}`;
}
