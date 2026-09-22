/**
 * Shared price-adjustment utilities used by QuickEventModal and EditableServicesTable.
 *
 * All monetary values are in CENTS (integer) unless explicitly noted otherwise.
 * This avoids floating-point drift in multi-step calculations.
 *
 * Adjustment.value semantics:
 *   PERCENT: signed percent; negative = discount (e.g. -10 → 10 % off)
 *   FIXED_NET / FIXED_GROSS: cents to SUBTRACT from net / gross
 *   SET_NET   / SET_GROSS:   target total net / gross in cents
 */

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export interface ServicePriceBase {
    basePriceNetCents: number;
    /** Exact stored gross paired with the net (catalog value); when present it is used
     *  instead of netToGross(), whose rounding skips some gross values (201.00 → 200.99). */
    basePriceGrossCents?: number;
    vatRate: number; // e.g. 23 for 23 %
}

// vatRate=-1 means "zwolniony" (exempt): gross equals net, no VAT applied

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

/**
 * DOKŁADNE brutto bazowe pozycji - to, które wpisał człowiek, a nie to, które
 * wychodzi z mnożenia netta przez stawkę.
 *
 * Powód istnienia tej funkcji jest arytmetyczny: przejście brutto → netto → brutto
 * NIE jest tożsamością. Przy 23% VAT nie istnieje kwota netto w groszach, z której
 * wyjdzie równo 1900,00 zł brutto - 154471 gr daje 1899,99, a 154472 gr daje
 * 1900,01. Jeżeli więc użytkownik wpisał 1900,00 brutto, jedynym sposobem, żeby
 * zobaczył 1900,00, jest NIE LICZYĆ tej kwoty ponownie.
 *
 * Kolejność źródeł, od najpewniejszego:
 *  1. [basePriceGross] - brutto zapisane przy pozycji (katalog usług, cena ręczna).
 *  2. [finalPriceGross] policzone przez serwer - można z niego wrócić do bazy,
 *     o ile wiemy, co rabat z nim zrobił: przy rabacie zerowym baza równa się
 *     kwocie końcowej, a przy upuście kwotowym brutto - kwocie końcowej plus upust.
 *  3. Brak - dopiero wtedy wolno policzyć brutto z netta.
 *
 * @returns brutto bazowe w groszach albo `undefined`, gdy nie da się go ustalić
 *          bez liczenia.
 */
export const exactBaseGross = (line: {
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    /** Brutto bazowe zapisane wprost przy pozycji. */
    basePriceGross?: number | null;
    /** Brutto końcowe policzone przez serwer dla TEGO rabatu. */
    finalPriceGross?: number | null;
}): number | undefined => {
    if (line.basePriceGross != null) return line.basePriceGross;
    if (line.finalPriceGross == null) return undefined;

    const { type, value } = line.adjustment;
    // Rabat zerowy: kwota końcowa JEST kwotą bazową.
    if (value === 0 && (type === 'PERCENT' || type === 'FIXED_NET' || type === 'FIXED_GROSS')) {
        return line.finalPriceGross;
    }
    // Upust kwotowy brutto liczy się wprost od brutto bazowego, więc da się go cofnąć.
    if (type === 'FIXED_GROSS') return line.finalPriceGross + value;
    // Rabaty liczone od netta (procent, upust netto, ustawienie netta) przechodzą
    // przez zaokrąglenie, którego nie da się jednoznacznie odwrócić.
    return undefined;
};

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
    /** Exact stored base gross (catalog value). When the adjustment flows gross-side or is
     *  a no-op, this exact gross is preserved instead of re-deriving from net: net→gross
     *  rounding skips some gross values entirely (e.g. 201.00 → 200.99 at 23 % VAT). */
    basePriceGrossCents?: number,
): { finalNetCents: number; finalGrossCents: number; hasDiscount: boolean } => {
    let finalNetCents = basePriceNetCents;
    const baseGross = basePriceGrossCents ?? netToGross(basePriceNetCents, vatRate);

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
            finalNetCents = grossToNet(baseGross - adjustment.value, vatRate);
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

    const isNoOp =
        (adjustment.type === 'PERCENT' || adjustment.type === 'FIXED_NET' || adjustment.type === 'FIXED_GROSS')
        && adjustment.value === 0;

    const finalGrossCents =
        adjustment.type === 'SET_GROSS' ? Math.max(0, adjustment.value)
        : adjustment.type === 'FIXED_GROSS' ? Math.max(0, baseGross - adjustment.value)
        : isNoOp ? baseGross
        : netToGross(finalNetCents, vatRate);

    return {
        finalNetCents,
        finalGrossCents,
        hasDiscount: finalNetCents !== basePriceNetCents,
    };
};

/**
 * Resolves the effective "list" net price (in cents) that per-line and bulk
 * discounts should be based on.
 *
 * Services that require a manual price are persisted with basePriceNet = 0 and
 * their actual price carried in a SET_NET/SET_GROSS adjustment (see
 * toApiServiceLineItem and the check-in wizard). For those the discount base is
 * the resolved net: using the raw basePriceNet (0) would collapse totals to 0
 * ("Łącznie przed rabatem" shows 0) and wipe the price when a discount is
 * distributed over a zero base. Normal catalog services return basePriceNet
 * unchanged.
 */
export const resolveBaseNet = (
    service: { basePriceNet: number; vatRate: number; adjustment: PriceAdjustment },
): number =>
    service.basePriceNet === 0 &&
    (service.adjustment.type === 'SET_NET' || service.adjustment.type === 'SET_GROSS')
        ? applyAdjustment(service.basePriceNet, service.vatRate, service.adjustment).finalNetCents
        : service.basePriceNet;

/** Pozycja, o której da się powiedzieć, jakie brutto ktoś ustalił. */
interface PricedLine {
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    basePriceGross?: number | null;
    finalPriceGross?: number | null;
}

/**
 * Dokładne brutto do pary z {@link resolveBaseNet} - albo `undefined`, gdy tej bazy
 * nikt nie ustalił od strony brutto i brutto wolno policzyć.
 *
 * Pozycja z ceną ręczną (`basePriceNet = 0` + SET_*) ma bazę równą kwocie ustalonej
 * z klientem: przy SET_GROSS jest nią wpisane brutto, przy SET_NET netto. Liczenie
 * brutto z netta takiej bazy dawało 1900,01 zł zamiast wpisanych 1900,00 zł przy
 * każdym rabacie i przy „Przywróć cenę z cennika".
 */
export const resolveBaseGross = (service: PricedLine): number | undefined => {
    if (service.basePriceNet === 0) {
        if (service.adjustment.type === 'SET_GROSS') return Math.max(0, service.adjustment.value);
        if (service.adjustment.type === 'SET_NET') return undefined;
    }
    return exactBaseGross(service);
};

/**
 * Czy brutto tej pary na pewno wpisał człowiek: różni się od netto × stawka, więc
 * z netta wyjść nie mogło. Para zgodna z przeliczeniem jest niejednoznaczna -
 * każda ze stron mogła być wpisana, więc to NIE jest dowód na netto.
 */
export const isTypedGross = (
    netCents: number,
    grossCents: number | null | undefined,
    vatRate: number,
): boolean => grossCents != null && grossCents !== netToGross(netCents, vatRate);

/**
 * Która strona ceny KOŃCOWEJ pozycji jest ustalona, a która policzona:
 *  - `'gross'` - brutto końcowe jest dokładne: SET_GROSS, upust brutto albo cena
 *    bazowa wpisana od strony brutto,
 *  - `'net'`   - brutto końcowe wynika z netta: SET_NET, rabat od netta albo brak
 *    jakiegokolwiek dokładnego brutto,
 *  - `null`    - nie da się tego rozstrzygnąć: brutto bazowe jest znane, ale równe
 *    netto × stawka (typowa pozycja z cennika).
 *
 * Zmiana stawki VAT zachowuje stronę ustaloną (CLAUDE.md §1) - inaczej kwota wpisana
 * przez człowieka zostałaby odtworzona z drugiej. Przy `null` o kierunku decyduje
 * ekran; każdy zachowuje wtedy swoje dotychczasowe zachowanie.
 */
export const typedPriceSide = (line: PricedLine): 'net' | 'gross' | null => {
    const { type, value } = line.adjustment;
    if (type === 'SET_GROSS') return 'gross';
    if (type === 'SET_NET') return 'net';
    if (value !== 0) return type === 'FIXED_GROSS' ? 'gross' : 'net';
    // Rabat zerowy: stronę wyznacza cena bazowa.
    const exact = exactBaseGross(line);
    if (exact == null) return 'net';
    return isTypedGross(line.basePriceNet, exact, line.vatRate) ? 'gross' : null;
};

/**
 * Para netto/brutto po zmianie stawki VAT: strona wpisana przez człowieka
 * przechodzi bez zmian, druga liczy się od nowa. Ta sama stawka - para wraca
 * nietknięta, bo przeliczenie „na wszelki wypadek" zgubiłoby grosz na brutto.
 */
export const repriceForVatRate = (
    price: { netCents: number; grossCents: number },
    fromRate: number,
    toRate: number,
    keep: 'net' | 'gross',
): { netCents: number; grossCents: number } => {
    if (fromRate === toRate) return price;
    return keep === 'gross'
        ? { netCents: grossToNet(price.grossCents, toRate), grossCents: price.grossCents }
        : { netCents: price.netCents, grossCents: netToGross(price.netCents, toRate) };
};

/**
 * Pozycja wyceny po zbiorczej zmianie stawki VAT.
 *
 * Ta sama stawka - pozycja wraca nietknięta, razem z dokładnym brutto (wcześniej
 * zmiana „na 23%" kasowała je także w pozycjach, które już miały 23%). Brutto
 * bazowe wpisane od strony brutto zostaje, a netto liczy się od nowa. W każdym
 * innym przypadku zostaje netto - udokumentowany wybór tego ekranu - a brutto
 * policzone przy starej stawce znika, żeby nie udawało dokładnego przy nowej.
 */
export function withVatRate<T extends { basePriceNet: number; basePriceGross?: number | null; vatRate: number }>(
    line: T,
    vatRate: number,
): T {
    if (line.vatRate === vatRate) return line;
    if (line.basePriceGross != null && isTypedGross(line.basePriceNet, line.basePriceGross, line.vatRate)) {
        return { ...line, vatRate, basePriceNet: grossToNet(line.basePriceGross, vatRate) };
    }
    return { ...line, vatRate, basePriceGross: undefined };
}

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
        s.basePriceGrossCents ?? netToGross(s.basePriceNetCents, s.vatRate);

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
    basePriceGross?: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    requireManualPrice?: boolean;
}>(service: T): T {
    if (!service.requireManualPrice) return service;
    const { finalNetCents, finalGrossCents } = applyAdjustment(
        service.basePriceNet, service.vatRate, service.adjustment, service.basePriceGross,
    );
    // When the manual price was entered gross-side, send SET_GROSS so the backend
    // keeps the exact gross the user typed (SET_NET would re-derive it with 1-grosz drift).
    const enteredGross = isTypedGross(service.basePriceNet, service.basePriceGross, service.vatRate);
    return {
        ...service,
        basePriceNet: 0,
        basePriceGross: undefined,
        adjustment: enteredGross
            ? { type: 'SET_GROSS', value: finalGrossCents }
            : { type: 'SET_NET', value: finalNetCents },
    };
}
