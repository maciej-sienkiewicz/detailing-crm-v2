// src/modules/finance/utils/outstandingTile.ts
//
// Czwarty kafel podsumowania finansów zależy od zakładki. Na „Dokumentach
// przychodowych" mówi, ile klienci są winni studiu (należności), a na „Dokumentach
// kosztowych" - ile studio jest winne dostawcom (zobowiązania). Wcześniej kafel
// zawsze pokazywał należności, także nad listą kosztów, gdzie pytanie brzmi
// „ile jeszcze muszę zapłacić".
//
// Kwota jest brutto: dług to to, co przejdzie przelewem, z VAT-em. Przychody,
// koszty i zysk w sąsiednich kaflach zostają netto.

import { pluralPl } from '@/common/utils';
import type { FinanceSummary } from '../types';

export type OutstandingSide = 'receivables' | 'payables';

export interface OutstandingTile {
    label: string;
    /** W groszach. */
    amountCents: number;
    note: string;
}

/**
 * `overdue*` z API to LICZBA przeterminowanych dokumentów, nie kwota. Kafel
 * przepuszczał ją kiedyś przez formatMoney, więc trzy zaległe faktury pokazywały
 * się jako „0,03 zł przeterminowane".
 */
const overdueLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'dokument', 'dokumenty', 'dokumentów')} po terminie`;

export function outstandingTile(summary: FinanceSummary, side: OutstandingSide): OutstandingTile {
    const receivables = side === 'receivables';
    const gross = receivables ? summary.pendingReceivablesGross : summary.pendingPayablesGross;
    const net = receivables ? summary.pendingReceivables : summary.pendingPayables;
    const overdue = receivables ? summary.overdueReceivables : summary.overduePayables;

    // Starszy serwer nie zna brutto - wtedy uczciwie netto, z takim podpisem.
    const amountCents = gross ?? net;
    const basis = gross !== undefined ? 'brutto' : 'netto';
    const who = receivables ? 'klienci jeszcze nie zapłacili' : 'jeszcze nie zapłaciłeś';

    return {
        label: receivables ? 'Należności' : 'Zobowiązania',
        amountCents,
        note: overdue > 0 ? `${basis}, w tym ${overdueLabel(overdue)}` : `${basis}, ${who}`,
    };
}
