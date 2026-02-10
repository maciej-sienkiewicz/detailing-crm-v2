// src/modules/appointments/hooks/useServicePricing.ts
import { dinero, add, subtract, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import { interpolate, t } from '@/common/i18n';
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

const toMoneyAmount = (money: ReturnType<typeof dinero>): MoneyAmount => {
    const json = money.toJSON();
    return json.amount;
};

export const useServicePricing = () => {
    const calculateServicePrice = (item: ServiceLineItem): PricingResult => {
        const { basePriceNet, vatRate, adjustment } = item;

        const baseNetMoney = createMoney(basePriceNet);

        const originalVatAmount = Math.round((basePriceNet * vatRate) / 100);
        const originalVat = createMoney(originalVatAmount);
        const originalGrossMoney = add(baseNetMoney, originalVat);

        let finalNetMoney = baseNetMoney;
        let hasDiscount = false;

        switch (adjustment.type) {
            case 'PERCENT': {
                if (adjustment.value !== 0) {
                    hasDiscount = true;
                    const percentageAmount = Math.round((basePriceNet * Math.abs(adjustment.value)) / 100);
                    const adjustmentMoney = createMoney(percentageAmount);

                    if (adjustment.value > 0) {
                        finalNetMoney = add(baseNetMoney, adjustmentMoney);
                    } else {
                        finalNetMoney = subtract(baseNetMoney, adjustmentMoney);
                    }
                }
                break;
            }
            case 'FIXED_NET': {
                if (adjustment.value !== 0) {
                    hasDiscount = true;
                    const adjustmentMoney = createMoney(Math.abs(adjustment.value));
                    finalNetMoney = subtract(baseNetMoney, adjustmentMoney);
                }
                break;
            }
            case 'FIXED_GROSS': {
                if (adjustment.value !== 0) {
                    hasDiscount = true;
                    const adjustmentMoney = createMoney(Math.abs(adjustment.value));
                    const targetGrossMoney = subtract(originalGrossMoney, adjustmentMoney);

                    const targetGrossAmount = toMoneyAmount(targetGrossMoney);
                    const finalNetAmount = Math.round((targetGrossAmount * 100) / (100 + vatRate));
                    finalNetMoney = createMoney(finalNetAmount);
                }
                break;
            }
            case 'SET_NET': {
                hasDiscount = true;
                finalNetMoney = createMoney(adjustment.value);
                break;
            }
            case 'SET_GROSS': {
                hasDiscount = true;
                const targetGrossAmount = adjustment.value;
                const finalNetAmount = Math.round((targetGrossAmount * 100) / (100 + vatRate));
                finalNetMoney = createMoney(finalNetAmount);
                break;
            }
        }

        if (toMoneyAmount(finalNetMoney) < 0) {
            finalNetMoney = createMoney(0);
        }

        let finalVat;
        let finalGrossMoney;

        if (adjustment.type === 'SET_GROSS') {
            // For SET_GROSS, ensure exact gross value
            finalGrossMoney = createMoney(adjustment.value);
            const finalVatAmount = adjustment.value - toMoneyAmount(finalNetMoney);
            finalVat = createMoney(finalVatAmount);
        } else {
            const finalVatAmount = Math.round((toMoneyAmount(finalNetMoney) * vatRate) / 100);
            finalVat = createMoney(finalVatAmount);
            finalGrossMoney = add(finalNetMoney, finalVat);
        }

        const discountLabel = getDiscountLabel(adjustment, hasDiscount);

        return {
            originalPriceNet: toMoneyAmount(baseNetMoney),
            originalPriceGross: toMoneyAmount(originalGrossMoney),
            finalPriceNet: toMoneyAmount(finalNetMoney),
            finalPriceGross: toMoneyAmount(finalGrossMoney),
            vatAmount: toMoneyAmount(finalVat),
            hasDiscount,
            discountLabel,
        };
    };

    const calculateTotal = (services: ServiceLineItem[]) => {
        let totalOriginalNetMoney = createMoney(0);
        let totalOriginalGrossMoney = createMoney(0);
        let totalFinalNetMoney = createMoney(0);
        let totalFinalGrossMoney = createMoney(0);
        let totalVatMoney = createMoney(0);

        services.forEach(item => {
            const pricing = calculateServicePrice(item);

            totalOriginalNetMoney = add(totalOriginalNetMoney, createMoney(pricing.originalPriceNet));
            totalOriginalGrossMoney = add(totalOriginalGrossMoney, createMoney(pricing.originalPriceGross));
            totalFinalNetMoney = add(totalFinalNetMoney, createMoney(pricing.finalPriceNet));
            totalFinalGrossMoney = add(totalFinalGrossMoney, createMoney(pricing.finalPriceGross));
            totalVatMoney = add(totalVatMoney, createMoney(pricing.vatAmount));
        });

        return {
            totalOriginalNet: toMoneyAmount(totalOriginalNetMoney),
            totalOriginalGross: toMoneyAmount(totalOriginalGrossMoney),
            totalFinalNet: toMoneyAmount(totalFinalNetMoney),
            totalFinalGross: toMoneyAmount(totalFinalGrossMoney),
            totalVat: toMoneyAmount(totalVatMoney),
            hasTotalDiscount: toMoneyAmount(totalFinalGrossMoney) < toMoneyAmount(totalOriginalGrossMoney),
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