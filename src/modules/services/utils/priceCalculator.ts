// src/modules/services/utils/priceCalculator.ts
import { dinero, add, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import type { VatRate, ServicePriceCalculation } from '../types';

const createMoney = (amount: number) => dinero({ amount, currency: PLN });

const toMoneyAmount = (money: ReturnType<typeof dinero>): number => {
    const json = money.toJSON();
    return json.amount;
};

export const calculateGrossFromNet = (netAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    const netMoney = createMoney(netAmount);

    const vatAmount = vatRate === -1 ? 0 : Math.round((netAmount * vatRate) / 100);
    const vatMoney = createMoney(vatAmount);

    const grossMoney = add(netMoney, vatMoney);

    return {
        priceNet: netAmount,
        vatAmount,
        priceGross: toMoneyAmount(grossMoney),
    };
};

export const calculateNetFromGross = (grossAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    if (vatRate === -1 || vatRate === 0) {
        return {
            priceNet: grossAmount,
            vatAmount: 0,
            priceGross: grossAmount,
        };
    }

    const netAmount = Math.round((grossAmount * 100) / (100 + vatRate));
    const vatAmount = grossAmount - netAmount;

    return {
        priceNet: netAmount,
        vatAmount,
        priceGross: grossAmount,
    };
};

export const formatMoneyAmount = (amount: number): string => {
    const money = createMoney(amount);
    const decimal = toDecimal(money);
    return parseFloat(decimal).toFixed(2);
};

export const parseMoneyInput = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
};