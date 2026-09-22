// src/modules/settings/components/services/servicePriceForm.helpers.ts
import { formatMoneyAmount, parseMoneyInput } from '@/modules/services/utils/priceCalculator';
import type { PriceInputFormat } from '@/common/utils/priceInputs';

/** Grosze → treść pola ceny w formularzu cennika: 190000 → „1900,00". */
export const formatDecimalInput = (grosze: number): string =>
    formatMoneyAmount(grosze).replace('.', ',');

/**
 * Pola ceny formularzy cennika (usługa i pakiet) dla `priceInputsForVatRate`.
 * Puste albo zerowe pole wpisane czyści drugie - tak samo, jak robi to wpisywanie.
 */
export const SERVICE_PRICE_INPUT: PriceInputFormat = {
    toCents: raw => {
        const grosze = parseMoneyInput(raw);
        return grosze > 0 ? grosze : null;
    },
    toInput: formatDecimalInput,
};
