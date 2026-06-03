/**
 * Shared price-adjustment utilities used by QuickEventModal and EditableServicesTable.
 *
 * All monetary values are in CENTS (integer) unless explicitly noted otherwise.
 * This avoids floating-point drift in multi-step calculations.
 *
 * Adjustment.value semantics:
 *   PERCENT   — signed percent; negative = discount (e.g. -10 → 10 % off)
 *   FIXED_NET / FIXED_GROSS — cents to SUBTRACT from net / gross
 *   SET_NET   / SET_GROSS   — target total net / gross in cents
 */

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export interface ServicePriceBase {
    basePriceNetCents: number;
    vatRate: number; // e.g. 23 for 23 %
}

// vatRate=-1 means "zwolniony" (exempt) — gross equals net, no VAT applied

/** Net cents → gross cents. Safe for vatRate=-1 (ZW) and 0. */
export const netToGross = (netCents: number, vatRate: number): number =>
    vatRate <= 0 ? netCents : netCents + Math.round(netCents * vatRate / 100);

/** Gross cents → net cents. Safe for vatRate=-1 (ZW) and 0. */
export const grossToNet = (grossCents: number, vatRate: number): number =>
    vatRate <= 0 ? grossCents : Math.round((grossCents * 100) / (100 + vatRate));

/** Net PLN → gross PLN (for display). Safe for vatRate=-1 (ZW) and 0. */
export const netPlnToGrossPln = (netPln: number, vatRate: number): number =>
    vatRate <= 0 ? netPln : netPln * (1 + vatRate / 100);

/** Gross PLN → net PLN (for display). Safe for vatRate=-1 (ZW) and 0. */
export const grossPlnToNetPln = (grossPln: number, vatRate: number): number =>
    vatRate <= 0 ? grossPln : grossPln / (1 + vatRate / 100);

// ─── Single-service calculation ───────────────────────────────────────────────

/**
 * Applies a price adjustment to a single service and returns the adjusted prices.
 *
 * @param basePriceNetCents  Base net price in cents
 * @param vatRate            VAT rate as a plain number (e.g. 23)
 * @param adjustment         The adjustment to apply
 */
export const applyAdjustment = (
    basePriceNetCents: number,
    vatRate: number,
    adjustment: PriceAdjustment,
): { finalNetCents: number; finalGrossCents: number; hasDiscount: boolean } => {
    let finalNetCents = basePriceNetCents;

    switch (adjustment.type) {
        case 'PERCENT': {
            const pct = Math.round(basePriceNetCents * Math.abs(adjustment.value) / 100);
            finalNetCents = adjustment.value > 0
                ? basePriceNetCents + pct
                : basePriceNetCents - pct;
            break;
        }
        case 'FIXED_NET':
            finalNetCents = basePriceNetCents - adjustment.value;
            break;
        case 'FIXED_GROSS': {
            const baseGrossCents = netToGross(basePriceNetCents, vatRate);
            finalNetCents = grossToNet(baseGrossCents - adjustment.value, vatRate);
            break;
        }
        case 'SET_NET':
            finalNetCents = adjustment.value;
            break;
        case 'SET_GROSS':
            finalNetCents = grossToNet(adjustment.value, vatRate);
            break;
    }

    if (finalNetCents < 0) finalNetCents = 0;

    const finalGrossCents =
        adjustment.type === 'SET_GROSS'
            ? adjustment.value
            : netToGross(finalNetCents, vatRate);

    return {
        finalNetCents,
        finalGrossCents,
        hasDiscount: finalNetCents !== basePriceNetCents,
    };
};

// ─── Bulk distribution ────────────────────────────────────────────────────────

/**
 * Distributes a single discount value proportionally across multiple services.
 *
 * For PERCENT: applies the same percentage to every service.
 * For FIXED_NET / SET_NET: distributes proportionally by base net price.
 * For FIXED_GROSS / SET_GROSS: distributes proportionally by base gross price.
 * Rounding remainder always goes to the last service.
 *
 * @param services       Array of { basePriceNetCents, vatRate }
 * @param discountType   Type of adjustment
 * @param discountValue  For PERCENT: absolute percent value (e.g. 10 → 10% off);
 *                       for all others: total value in cents
 *
 * @returns  Array of PriceAdjustment (same order and length as `services`)
 */
export const distributeAdjustment = (
    services: ServicePriceBase[],
    discountType: AdjustmentType,
    discountValue: number,
): PriceAdjustment[] => {
    if (services.length === 0) return [];

    if (discountType === 'PERCENT') {
        const value = -Math.abs(discountValue);
        return services.map(() => ({ type: 'PERCENT', value }));
    }

    const getBaseGross = (s: ServicePriceBase) =>
        netToGross(s.basePriceNetCents, s.vatRate);

    const usesNet = discountType === 'FIXED_NET' || discountType === 'SET_NET';
    const totals = usesNet
        ? services.reduce((sum, s) => sum + s.basePriceNetCents, 0)
        : services.reduce((sum, s) => sum + getBaseGross(s), 0);

    if (totals === 0) {
        return services.map(() => ({ type: discountType, value: 0 }));
    }

    let remaining = discountValue;

    return services.map((s, i) => {
        const base = usesNet ? s.basePriceNetCents : getBaseGross(s);
        const share =
            i === services.length - 1
                ? remaining
                : Math.round(discountValue * base / totals);
        remaining -= share;
        return { type: discountType, value: share };
    });
};

/**
 * Converts a requireManualPrice service for API submission.
 * In the UI the entered price lives in basePriceNet so discounts can be applied
 * normally. Before sending to the server we collapse basePriceNet + adjustment
 * into a single SET_NET on basePriceNet=0, which is what the backend expects.
 */
export function toApiServiceLineItem<T extends {
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    requireManualPrice?: boolean;
}>(service: T): T {
    if (!service.requireManualPrice) return service;
    const { finalNetCents } = applyAdjustment(service.basePriceNet, service.vatRate, service.adjustment);
    return {
        ...service,
        basePriceNet: 0,
        adjustment: { type: 'SET_NET', value: finalNetCents },
    };
}
