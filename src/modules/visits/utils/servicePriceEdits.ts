// src/modules/visits/utils/servicePriceEdits.ts
//
// Ceny w edycji „Wykazu usług" wizyty: to, co tabela pokazuje, i to, co wysyła
// do PATCH /visits/{id}/services/.
//
// Wszystko liczy się tak samo jak na serwerze (PriceCalculator): rabat od netta
// liczy brutto z netta końcowego, a SET_GROSS, upust brutto i rabat zerowy niosą
// DOKŁADNE brutto - wpisane albo z cennika (CLAUDE.md §1). Do serwera jedzie ono
// polem `basePriceGross`; bez niego serwer odtworzyłby 1900,00 zł jako 1900,01 zł.

import {
    applyAdjustment, distributeAdjustment, exactBaseGross, grossToNet, netToGross,
    resolveBaseGross, resolveBaseNet, typedPriceSide,
} from '@/common/utils/priceAdjustment';
import type { AdjustmentType, PriceAdjustment, ServicePriceBase } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem, ServicesChangesPayload } from '../types';

/** Niezapisana zmiana ceny pozycji wizyty. */
export interface EditedPrice {
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    /**
     * Dokładne brutto do pary z `basePriceNet` przy `vatRate` - wpisane albo z cennika.
     * Brak = nikt go nie ustalił i wolno je policzyć z netta.
     */
    basePriceGross?: number;
}

/** Pozycja wizyty z cenami - bez null-i, które dostaje widok bez uprawnienia do cen. */
export interface PricedLine {
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    basePriceGross?: number | null;
    finalPriceGross?: number | null;
}

/** Nowy wiersz dopisywany w tabeli (kształt `NewRow` z ServiceInlineRow). */
export interface DraftPriceRow {
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;
    /** Dokładne brutto: wpisane w wierszu albo z cennika. */
    basePriceGross?: number;
    vatRate: number;
    requireManualPrice: boolean;
    adjustment: PriceAdjustment;
}

export interface LinePrice {
    finalNetCents: number;
    finalGrossCents: number;
    /** Brutto przed rabatem - dokładne, gdy ktoś je ustalił. */
    originalGrossCents: number;
}

const NO_ADJUSTMENT: PriceAdjustment = { type: 'PERCENT', value: 0 };

export const pricedLine = (
    s: Pick<ServiceLineItem, 'basePriceNet' | 'vatRate' | 'adjustment' | 'basePriceGross' | 'finalPriceGross'>,
): PricedLine => ({
    basePriceNet: s.basePriceNet ?? 0,
    vatRate: s.vatRate ?? 23,
    adjustment: s.adjustment ?? NO_ADJUSTMENT,
    basePriceGross: s.basePriceGross ?? null,
    finalPriceGross: s.finalPriceGross,
});

/** Cena pozycji zapisanej na serwerze - ta sama reguła co `calculateServicePrice`. */
export const linePrice = (line: PricedLine): LinePrice => {
    const originalGrossCents = exactBaseGross(line) ?? netToGross(line.basePriceNet, line.vatRate);
    const { finalNetCents, finalGrossCents } = applyAdjustment(
        line.basePriceNet, line.vatRate, line.adjustment, originalGrossCents,
    );
    return { finalNetCents, finalGrossCents, originalGrossCents };
};

/** Cena po niezapisanej zmianie. */
export const editedPrice = (ep: EditedPrice): LinePrice => {
    const originalGrossCents = ep.basePriceGross ?? netToGross(ep.basePriceNet, ep.vatRate);
    const { finalNetCents, finalGrossCents } = applyAdjustment(
        ep.basePriceNet, ep.vatRate, ep.adjustment, originalGrossCents,
    );
    return { finalNetCents, finalGrossCents, originalGrossCents };
};

/** Cena, którą pozycja ma TERAZ - po zmianie, jeśli jakaś czeka na zapis. */
export const currentPrice = (line: PricedLine, ep?: EditedPrice): LinePrice =>
    ep ? editedPrice(ep) : linePrice(line);

/**
 * Pozycja do wyświetlenia po lokalnej zmianie ceny. Brutto przysłane przez serwer
 * dotyczyło POPRZEDNIEJ ceny, więc idzie do kosza - razem z dokładnym brutto bazowym,
 * które zostaje wyłącznie wtedy, gdy niesie je sama zmiana. Samo rozlanie zmiany
 * zostawiłoby stare `basePriceGross` i pokazywało je jako dokładne.
 */
export const withEditedPrice = <T extends ServiceLineItem>(service: T, ep: EditedPrice | undefined): T =>
    ep ? { ...service, ...ep, basePriceGross: ep.basePriceGross ?? null, finalPriceGross: null } : service;

// ─── Pola kwot w edytorze ─────────────────────────────────────────────────────

/** Kwota z pola (zł, przecinek albo kropka) w groszach; null, gdy to nie jest kwota. */
export const parseZlCents = (raw: string): number | null => {
    const v = parseFloat(raw.replace(',', '.'));
    return isNaN(v) || v < 0 ? null : Math.round(v * 100);
};

/** Grosze jako zawartość pola kwoty: „1900.00". */
export const formatZlField = (cents: number): string => (cents / 100).toFixed(2);

/** Pole brutto dla wpisanego netta - albo null, gdy netto nie jest kwotą. */
export const grossFieldFor = (netField: string, vatRate: number): string | null => {
    const net = parseZlCents(netField);
    return net === null ? null : formatZlField(netToGross(net, vatRate));
};

/** Pole netto dla wpisanego brutto - albo null, gdy brutto nie jest kwotą. */
export const netFieldFor = (grossField: string, vatRate: number): string | null => {
    const gross = parseZlCents(grossField);
    return gross === null ? null : formatZlField(grossToNet(gross, vatRate));
};

// ─── Okno „Cena usługi" ───────────────────────────────────────────────────────

export interface EditorPrefill {
    netCents: number;
    grossCents: number;
    vatRate: number;
    /** Strona, którą zachowa zmiana samej stawki VAT. */
    lastField: 'net' | 'gross';
}

/**
 * Wartości, którymi otwiera się okno: kwota, którą pozycja ma teraz, z brutto
 * DOKŁADNYM - nie z netto × stawka (tak 1900,00 zł otwierało się jako 1900,01 zł
 * i po samej zmianie stawki zapisywało się jako SET_GROSS 1900,01).
 *
 * `lastField` to strona ustalona. Przy pozycji z cennika, gdzie nie da się tego
 * rozstrzygnąć, okno zachowuje brutto - tak jak dotąd.
 */
export const editorPrefill = (line: PricedLine, ep?: EditedPrice): EditorPrefill => {
    const price = currentPrice(line, ep);
    return {
        netCents: price.finalNetCents,
        grossCents: price.finalGrossCents,
        vatRate: ep?.vatRate ?? line.vatRate,
        lastField: typedPriceSide(ep ?? line) ?? 'gross',
    };
};

export interface EditorInputs {
    mode: 'SET' | 'DISCOUNT';
    discountType: AdjustmentType;
    discount: string;
    net: string;
    gross: string;
    lastField: 'net' | 'gross';
}

/** Korekta wynikająca z pól okna: rabat albo cena wpisana od strony, którą wpisano. */
export const editorAdjustment = (input: EditorInputs): PriceAdjustment => {
    if (input.mode === 'DISCOUNT') {
        const val = parseFloat(input.discount.replace(',', '.'));
        const value = isNaN(val) ? 0
            : input.discountType === 'PERCENT' ? -Math.abs(val) : Math.round(val * 100);
        return { type: input.discountType, value };
    }
    const net = parseZlCents(input.net);
    const gross = parseZlCents(input.gross);
    return input.lastField === 'gross' && gross !== null
        ? { type: 'SET_GROSS', value: gross }
        : { type: 'SET_NET', value: net ?? 0 };
};

export interface EditorPreview {
    adj: PriceAdjustment;
    finalNetCents: number;
    finalGrossCents: number;
    /** „Cena z cennika" brutto przy stawce z okna. */
    listGross: number;
    savedGross: number;
}

/**
 * Podgląd okna względem ceny z CENNIKA pozycji (nie względem poprzedniej zmiany).
 * Dokładne brutto bazowe obowiązuje tylko przy stawce, przy której je ustalono -
 * po zmianie stawki baza liczy się z netta, tak samo jak na serwerze.
 */
export const editorPreview = (line: PricedLine, vatRate: number, adj: PriceAdjustment): EditorPreview => {
    const baseNet = resolveBaseNet(line);
    const exactGross = vatRate === line.vatRate ? resolveBaseGross(line) : undefined;
    const listGross = exactGross ?? netToGross(baseNet, vatRate);
    const { finalNetCents, finalGrossCents } = applyAdjustment(baseNet, vatRate, adj, exactGross);
    return { adj, finalNetCents, finalGrossCents, listGross, savedGross: listGross - finalGrossCents };
};

/**
 * Strona, którą ma zachować zmiana stawki po przejściu z „Udziel rabatu" do „Wpisz
 * cenę": po rabacie od netta ustalone jest netto, po upuście brutto - brutto.
 */
export const previewSide = (line: PricedLine, vatRate: number, adj: PriceAdjustment): 'net' | 'gross' =>
    typedPriceSide({
        basePriceNet: resolveBaseNet(line),
        vatRate,
        adjustment: adj,
        basePriceGross: vatRate === line.vatRate ? resolveBaseGross(line) : undefined,
    }) ?? 'gross';

/** Zmiana zapisywana przyciskiem „Zapisz cenę" - baza z cennika i jej dokładne brutto. */
export const editFromEditor = (line: PricedLine, vatRate: number, adj: PriceAdjustment): EditedPrice => ({
    basePriceNet: resolveBaseNet(line),
    vatRate,
    adjustment: adj,
    basePriceGross: vatRate === line.vatRate ? resolveBaseGross(line) : undefined,
});

/**
 * „Przywróć cenę z cennika": bez rabatu, ze stawką i DOKŁADNYM brutto pozycji. Dla
 * usługi z ceną ręczną „cena z cennika" to kwota ustalona z klientem.
 */
export const restoreListPrice = (line: PricedLine): EditedPrice =>
    editFromEditor(line, line.vatRate, NO_ADJUSTMENT);

// ─── Operacje zbiorcze ────────────────────────────────────────────────────────

type IdentifiedLine = PricedLine & { id: string };

/**
 * „VAT dla wszystkich usług". Pozycja, która już ma tę stawkę, zostaje nietknięta
 * razem z dokładnym brutto (wcześniej każda dostawała SET_NET, więc 1900,00 zł
 * stawało się 1900,01 zł nawet bez zmiany stawki). Przy zmianie stawki zostaje
 * strona ustalona: dokładne brutto jako SET_GROSS albo netto jako SET_NET. Pozycja
 * z cennika, przy której nie da się tego rozstrzygnąć, zachowuje netto - jak dotąd.
 */
export const bulkVatEdits = (
    lines: IdentifiedLine[],
    edits: Record<string, EditedPrice>,
    vatRate: number,
): Record<string, EditedPrice> => {
    const next = { ...edits };
    for (const line of lines) {
        const ep = edits[line.id];
        if ((ep?.vatRate ?? line.vatRate) === vatRate) continue;
        const price = currentPrice(line, ep);
        const side = typedPriceSide(ep ?? line) ?? 'net';
        next[line.id] = {
            basePriceNet: line.basePriceNet,
            vatRate,
            adjustment: side === 'gross'
                ? { type: 'SET_GROSS', value: price.finalGrossCents }
                : { type: 'SET_NET', value: price.finalNetCents },
        };
    }
    return next;
};

export interface BulkDiscountRow {
    id: string;
    beforeNet: number;
    beforeGross: number;
    afterNet: number;
    afterGross: number;
}

export interface BulkDiscountPlan {
    bases: ServicePriceBase[];
    rows: BulkDiscountRow[];
    edits: Record<string, EditedPrice>;
}

/**
 * „Rabatuj całość" - podgląd i zmiany z jednego wyliczenia, żeby okno nie
 * obiecywało innych kwot niż te, które zapisze.
 *
 * `discountValue`: dla PERCENT procent, dla reszty grosze; null = nic jeszcze nie
 * wpisano (sam podgląd „przed rabatem").
 *
 * „Nadpisz zmiany" (`useEdited = false`) liczy od ceny z cennika z jej dokładnym
 * brutto i wysyła je razem z rabatem. „Uwzględnij poprawki" liczy od ceny po
 * zmianach i zapisuje wynik jako cenę ustaloną: SET_GROSS po rabacie od brutto,
 * SET_NET po rabacie od netta - wcześniej zawsze SET_NET, więc 1710,00 zł brutto
 * po upuście wracało jako 1710,01 zł.
 */
export const bulkDiscountPlan = (
    lines: IdentifiedLine[],
    edits: Record<string, EditedPrice>,
    discountType: AdjustmentType,
    discountValue: number | null,
    useEdited: boolean,
): BulkDiscountPlan => {
    const bases: ServicePriceBase[] = lines.map(line => {
        const ep = edits[line.id];
        if (useEdited && ep) {
            // Brutto po zmianie jest dokładne albo równe netto × stawka - w obu
            // przypadkach wolno je przenieść jako bazę.
            const price = editedPrice(ep);
            return { basePriceNetCents: price.finalNetCents, basePriceGrossCents: price.finalGrossCents, vatRate: ep.vatRate };
        }
        return { basePriceNetCents: resolveBaseNet(line), basePriceGrossCents: resolveBaseGross(line), vatRate: line.vatRate };
    });

    const adjustments = discountValue === null ? null : distributeAdjustment(bases, discountType, discountValue);
    const next = { ...edits };

    const rows = lines.map((line, i): BulkDiscountRow => {
        const base = bases[i];
        const beforeNet = base.basePriceNetCents;
        const beforeGross = base.basePriceGrossCents ?? netToGross(base.basePriceNetCents, base.vatRate);
        if (!adjustments) {
            return { id: line.id, beforeNet, beforeGross, afterNet: beforeNet, afterGross: beforeGross };
        }
        const adj = adjustments[i];
        const { finalNetCents, finalGrossCents } = applyAdjustment(
            base.basePriceNetCents, base.vatRate, adj, base.basePriceGrossCents,
        );
        // Strona ustalona po rabacie: przy udziale zerowym (rabat nie dotknął pozycji)
        // zostaje nią dokładne brutto, a nie netto, z którego wyszłoby 1900,01 zł.
        const side = typedPriceSide({
            basePriceNet: base.basePriceNetCents, vatRate: base.vatRate, adjustment: adj, basePriceGross: base.basePriceGrossCents,
        });
        next[line.id] = useEdited
            ? {
                basePriceNet: line.basePriceNet, // baza z cennika zostaje
                vatRate: base.vatRate,
                adjustment: side === 'gross'
                    ? { type: 'SET_GROSS', value: Math.max(0, finalGrossCents) }
                    : { type: 'SET_NET', value: Math.max(0, finalNetCents) },
                basePriceGross: base.vatRate === line.vatRate ? exactBaseGross(line) : undefined,
            }
            : {
                basePriceNet: base.basePriceNetCents,
                vatRate: line.vatRate,
                adjustment: adj,
                basePriceGross: base.basePriceGrossCents,
            };
        return { id: line.id, beforeNet, beforeGross, afterNet: finalNetCents, afterGross: finalGrossCents };
    });

    return { bases, rows, edits: next };
};

// ─── Sumy i zapis ─────────────────────────────────────────────────────────────

export interface VisitTotals {
    totalFinalNet: number;
    totalFinalGross: number;
    totalVat: number;
    totalDiscountGross: number;
    hasTotalDiscount: boolean;
    /** Stan sprzed edycji w tej sesji: bez usunięć, bez zmian cen, bez nowych wierszy. */
    totalGrossBefore: number;
}

const isPendingLine = (s: ServiceLineItem): boolean => s.hasPendingChange ?? (s.status === 'PENDING');

/**
 * Sumy „Razem do zapłaty" - te same kwoty idą do treści SMS-a dla klienta, więc
 * każda pozycja liczy się z dokładnym brutto, a nie z netto × stawka.
 */
export const visitTotals = (input: {
    services: ServiceLineItem[];
    editedPrices: Record<string, EditedPrice>;
    newRows: DraftPriceRow[];
    deletedIds: ReadonlySet<string>;
}): VisitTotals => {
    let totalFinalNet = 0;
    let totalFinalGross = 0;
    let totalVat = 0;
    let totalOriginalGross = 0;
    let totalGrossBefore = 0;

    const add = (net: number, gross: number, original: number) => {
        totalFinalNet += net;
        totalFinalGross += gross;
        // VAT to różnica pokazanych kwot, a nie osobne mnożenie.
        totalVat += Math.max(gross - net, 0);
        totalOriginalGross += original;
    };

    for (const service of input.services) {
        const line = pricedLine(service);
        const pending = isPendingLine(service);
        const pendingEdit = pending && service.pendingOperation === 'EDIT';
        totalGrossBefore += pendingEdit && service.previousPriceGross != null
            ? service.previousPriceGross
            : linePrice(line).finalGrossCents;

        if (input.deletedIds.has(service.id)) continue;
        if (pendingEdit && service.previousPriceNet != null && service.previousPriceGross != null) {
            add(service.previousPriceNet, service.previousPriceGross, service.previousPriceGross);
            continue;
        }
        const price = currentPrice(line, input.editedPrices[service.id]);
        add(price.finalNetCents, price.finalGrossCents, price.originalGrossCents);
    }

    for (const row of input.newRows) {
        if (!row.serviceName.trim()) continue;
        const baseGross = draftRowGross(row);
        const { finalNetCents, finalGrossCents } = applyAdjustment(
            row.basePriceNet, row.vatRate, row.adjustment, baseGross,
        );
        add(finalNetCents, finalGrossCents, baseGross);
    }

    const totalDiscountGross = Math.max(totalOriginalGross - totalFinalGross, 0);
    return {
        totalFinalNet,
        totalFinalGross,
        totalVat,
        totalDiscountGross,
        hasTotalDiscount: totalDiscountGross > 0,
        totalGrossBefore,
    };
};

/** Brutto bazowe nowego wiersza: dokładne, gdy wpisane albo z cennika. */
export const draftRowGross = (row: Pick<DraftPriceRow, 'basePriceNet' | 'basePriceGross' | 'vatRate'>): number =>
    row.basePriceGross ?? netToGross(row.basePriceNet, row.vatRate);

/** Wiersz z usługą z cennika po cenie z cennika - kwot nie da się w nim wpisać. */
export const isCatalogPricedRow = (row: Pick<DraftPriceRow, 'serviceId' | 'requireManualPrice'>): boolean =>
    row.serviceId !== null && !row.requireManualPrice;

/**
 * Treść PATCH /visits/{id}/services/.
 *
 * Brutto wpisane przez człowieka jedzie polem `basePriceGross`. Wiersz z cennika go
 * nie niesie: serwer bierze wtedy brutto z katalogu sam, a przestarzała para
 * z katalogu nie zablokuje zapisu kontrolą spójności ±1 gr.
 */
export const buildServicesChangesPayload = (input: {
    newRows: DraftPriceRow[];
    editedPrices: Record<string, EditedPrice>;
    deletedIds: ReadonlySet<string>;
    notifyCustomer: boolean;
    requireConfirmation: boolean;
}): ServicesChangesPayload => ({
    notifyCustomer: input.notifyCustomer,
    requireConfirmation: input.notifyCustomer ? input.requireConfirmation : false,
    added: input.newRows.filter(r => r.serviceName.trim()).map(r => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        basePriceNet: r.basePriceNet,
        vatRate: r.vatRate,
        adjustment: r.adjustment,
        note: '',
        ...(r.basePriceGross != null && !isCatalogPricedRow(r) ? { basePriceGross: r.basePriceGross } : {}),
    })),
    updated: Object.entries(input.editedPrices).map(([serviceLineItemId, ep]) => ({
        serviceLineItemId,
        basePriceNet: ep.basePriceNet,
        vatRate: ep.vatRate,
        adjustment: ep.adjustment,
        ...(ep.basePriceGross != null ? { basePriceGross: ep.basePriceGross } : {}),
    })),
    deleted: Array.from(input.deletedIds).map(id => ({ serviceLineItemId: id })),
});
