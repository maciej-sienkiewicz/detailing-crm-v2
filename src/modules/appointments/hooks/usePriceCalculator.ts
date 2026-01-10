import { dinero, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import type { MoneyAmount } from '../types';

export const formatMoneyAmount = (amount: MoneyAmount): string => {
    const money = dinero({ amount, currency: PLN });
    return toDecimal(money);
};

export const parseMoneyAmount = (value: string): MoneyAmount => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
};