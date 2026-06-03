// src/modules/services/utils/priceCalculator.ts
import { dinero, add, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import type { VatRate, ServicePriceCalculation } from '../types';

const createMoney = (amount: number) => dinero({ amount, currency: PLN });

const toMoneyAmount = (money: ReturnType<typeof dinero>): number => {
    const json = money.toJSON();
    return json.amount;
};

export const calculateGrossFromNet = (netAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    const grossAmount = netToGross(netAmount, vatRate);
    return {
        priceNet: netAmount,
        vatAmount: grossAmount - netAmount,
        priceGross: grossAmount,
    };
};

export const calculateNetFromGross = (grossAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    const netAmount = grossToNet(grossAmount, vatRate);
    return {
        priceNet: netAmount,
        vatAmount: grossAmount - netAmount,
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