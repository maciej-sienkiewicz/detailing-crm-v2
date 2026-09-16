// src/modules/appointments/hooks/useServicePricing.ts
//
// Jedna reguła cenowa dla pozycji usługowej - ta sama, którą liczy serwer
// i której używa edytor wyceny (`applyAdjustment` w common/utils/priceAdjustment).
//
// KLUCZOWA ZASADA: brutto, które ktoś już ustalił, JEST brutto. Nie wolno go liczyć
// po raz drugi. Przejście brutto → netto → brutto nie jest tożsamością: przy 23%
// VAT nie istnieje kwota netto w groszach dająca równo 1900,00 zł brutto (154471 gr
// → 1899,99; 154472 gr → 1900,01). Ta funkcja miała wcześniej własną, równoległą
// implementację rabatów, w której brutto POWSTAWAŁO z netta w każdym przypadku
// poza SET_GROSS - i dlatego usługa wpisana jako 1900,00 zł brutto pokazywała się
// w tabeli „Usługi" jako 1900,01 zł, mimo że serwer przysłał poprawne 190000 gr.
//
// Teraz liczy się tylko to, czego nikt nie ustalił: kwotę końcową po rabacie
// zmieniającym netto. Reszta jest przepisywana.
import { interpolate, t } from '@/common/i18n';
import { dinero, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import { applyAdjustment, exactBaseGross, netToGross } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem, MoneyAmount } from '../types';

export interface PricingResult {
    originalPriceNet: MoneyAmount;
    originalPriceGross: MoneyAmount;
    finalPriceNet: MoneyAmount;
    finalPriceGross: MoneyAmount;
    vatAmount: MoneyAmount;
    hasDiscount: boolean;
    discountLabel: string;
}

const createMoney = (amount: MoneyAmount) => dinero({ amount, currency: PLN });

/**
 * Czy pozycja niesie rabat - w rozumieniu INTERFEJSU, nie arytmetyki.
 *
 * „Ustaw cenę" jest rabatem zawsze (ktoś świadomie nadpisał cennik), a upust
 * o wartości zero nie jest rabatem nigdy. Celowo nie jest to porównanie kwot:
 * rabat -0,4% na 100 zł zaokrągla się do zera groszy, ale etykieta „-0,4%" ma się
 * pokazać, bo ktoś ją wpisał.
 */
const hasDiscountFor = (adjustment: ServiceLineItem['adjustment']): boolean =>
    adjustment.type === 'SET_NET' || adjustment.type === 'SET_GROSS'
        ? true
        : adjustment.value !== 0;

export const useServicePricing = () => {
    const calculateServicePrice = (item: ServiceLineItem): PricingResult => {
        const { basePriceNet, vatRate, adjustment } = item;

        // Brutto bazowe: najpierw to, co ktoś ustalił, i dopiero w ostateczności
        // policzone ze stawki VAT.
        const originalPriceGross = exactBaseGross(item) ?? netToGross(basePriceNet, vatRate);
        const { finalNetCents, finalGrossCents } = applyAdjustment(
            basePriceNet, vatRate, adjustment, originalPriceGross,
        );
        const hasDiscount = hasDiscountFor(adjustment);

        return {
            originalPriceNet: basePriceNet,
            originalPriceGross,
            finalPriceNet: finalNetCents,
            finalPriceGross: finalGrossCents,
            // VAT to różnica pokazanych kwot, a nie osobne mnożenie. Inaczej suma
            // netto + VAT nie zgadzałaby się z brutto w tej samej linijce.
            vatAmount: Math.max(finalGrossCents - finalNetCents, 0),
            hasDiscount,
            discountLabel: getDiscountLabel(adjustment, hasDiscount),
        };
    };

    const calculateTotal = (services: ServiceLineItem[]) => {
        // Sumy to dodawanie groszy - liczb całkowitych. Owijanie każdej z nich
        // w obiekt pieniężny niczego tu nie chroniło, a dawało trzecie miejsce,
        // w którym te same kwoty mogły się rozjechać.
        const totals = services.reduce(
            (acc, item) => {
                const pricing = calculateServicePrice(item);
                acc.totalOriginalNet += pricing.originalPriceNet;
                acc.totalOriginalGross += pricing.originalPriceGross;
                acc.totalFinalNet += pricing.finalPriceNet;
                acc.totalFinalGross += pricing.finalPriceGross;
                acc.totalVat += pricing.vatAmount;
                return acc;
            },
            {
                totalOriginalNet: 0,
                totalOriginalGross: 0,
                totalFinalNet: 0,
                totalFinalGross: 0,
                totalVat: 0,
            },
        );

        return {
            ...totals,
            hasTotalDiscount: totals.totalFinalGross < totals.totalOriginalGross,
        };
    };

    return {
        calculateServicePrice,
        calculateTotal,
    };
};

const getDiscountLabel = (adjustment: ServiceLineItem['adjustment'], hasDiscount: boolean): string => {
    if (!hasDiscount) return '';

    switch (adjustment.type) {
        case 'PERCENT': {
            const value = adjustment.value > 0 ? `+${adjustment.value}` : `${adjustment.value}`;
            return interpolate(t.appointments.invoiceSummary.discountLabels.percent, { value });
        }
        case 'FIXED_NET': {
            const money = createMoney(Math.abs(adjustment.value));
            const value = toDecimal(money);
            return interpolate(t.appointments.invoiceSummary.discountLabels.discountNet, { value });
        }
        case 'FIXED_GROSS': {
            const money = createMoney(Math.abs(adjustment.value));
            const value = toDecimal(money);
            return interpolate(t.appointments.invoiceSummary.discountLabels.discountGross, { value });
        }
        case 'SET_NET': {
            const money = createMoney(adjustment.value);
            const value = toDecimal(money);
            return interpolate(t.appointments.invoiceSummary.discountLabels.setPriceNet, { value });
        }
        case 'SET_GROSS': {
            const money = createMoney(adjustment.value);
            const value = toDecimal(money);
            return interpolate(t.appointments.invoiceSummary.discountLabels.setPriceGross, { value });
        }
        default:
            return '';
    }
};