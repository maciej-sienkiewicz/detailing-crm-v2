// src/modules/settings/components/services/servicesTable.helpers.ts
import { formatMoneyAmount } from '@/modules/services/utils/priceCalculator';
import type { VatRate } from '@/modules/services/types';

/** Shared column template: header, skeleton and data rows must all use it. */
export const SERVICES_TABLE_GRID = '1fr 64px 160px 90px 72px';

export const formatPLN = (grosze: number): string => {
    const formatted = formatMoneyAmount(grosze);
    return `${parseFloat(formatted).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} zł`;
};

export const vatLabel = (rate: VatRate): string => (rate === -1 ? 'zw.' : `${rate}%`);
