// src/modules/visits/utils/settlementLines.ts
//
// Pozycje w oknie „Popraw rozliczenie": netto, brutto, stawka i strona wpisana.
// Arytmetyka VAT tylko z priceAdjustment.ts. Strona wpisana przez człowieka zostaje
// co do grosza przy zmianie stawki (CLAUDE.md §1): 1900,00 zł brutto przy 23% → 8%
// → 23% wraca jako 1900,00 zł, a nie 1900,01 zł.

import { centsToInput, inputToCents } from '@/common/utils/moneyInput';
import { grossToNet, netToGross, repriceForVatRate } from '@/common/utils/priceAdjustment';
import type { SettlementService, SettlementServiceLine } from '../api/settlementApi';

export interface SettlementLineDraft {
    id: string;
    name: string;
    vatRate: number;
    net: string;
    gross: string;
    side: 'net' | 'gross';
    original: SettlementService;
}

export const SETTLEMENT_VAT_RATES: Array<{ value: string; label: string }> = [
    { value: '23', label: '23%' },
    { value: '8', label: '8%' },
    { value: '5', label: '5%' },
    { value: '0', label: '0%' },
    { value: '-1', label: 'zw.' },
];

export const lineFromService = (s: SettlementService): SettlementLineDraft => ({
    id: s.id,
    name: s.name,
    vatRate: s.vatRate,
    net: centsToInput(s.netCents),
    gross: centsToInput(s.grossCents),
    side: s.grossTyped ? 'gross' : 'net',
    original: s,
});

export const withLineNet = (line: SettlementLineDraft, raw: string): SettlementLineDraft => ({
    ...line,
    net: raw,
    gross: raw.trim() === '' ? '' : centsToInput(netToGross(inputToCents(raw), line.vatRate)),
    side: 'net',
});

export const withLineGross = (line: SettlementLineDraft, raw: string): SettlementLineDraft => ({
    ...line,
    gross: raw,
    net: raw.trim() === '' ? '' : centsToInput(grossToNet(inputToCents(raw), line.vatRate)),
    side: 'gross',
});

export const withLineVatRate = (line: SettlementLineDraft, vatRate: number): SettlementLineDraft => {
    const repriced = repriceForVatRate(
        { netCents: inputToCents(line.net), grossCents: inputToCents(line.gross) },
        line.vatRate, vatRate, line.side,
    );
    return { ...line, vatRate, net: centsToInput(repriced.netCents), gross: centsToInput(repriced.grossCents) };
};

export const lineGrossCents = (line: SettlementLineDraft): number => inputToCents(line.gross);

/** Pozycja różni się od zapisanej: cena albo stawka. */
export const lineChanged = (line: SettlementLineDraft): boolean =>
    line.vatRate !== line.original.vatRate ||
    inputToCents(line.net) !== line.original.netCents ||
    inputToCents(line.gross) !== line.original.grossCents;

/** Do API tylko pozycje zmienione; brutto tylko wtedy, gdy to ono jest wpisane. */
export const changedServiceLines = (lines: SettlementLineDraft[]): SettlementServiceLine[] =>
    lines.filter(lineChanged).map(line => ({
        serviceLineItemId: line.id,
        netCents: inputToCents(line.net),
        grossCents: line.side === 'gross' ? inputToCents(line.gross) : null,
        vatRate: line.vatRate,
    }));

export const totalGrossCents = (lines: SettlementLineDraft[]): number =>
    lines.reduce((sum, line) => sum + lineGrossCents(line), 0);
