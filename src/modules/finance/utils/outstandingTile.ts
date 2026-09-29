// src/modules/finance/utils/outstandingTile.ts
//
// Czwarty kafel podsumowania finansów, „Należności", zależy od zakładki. Na
// „Dokumentach przychodowych" mówi, ile klienci są winni studiu, a na „Dokumentach
// kosztowych" - ile studio jest winne dostawcom. Wcześniej kafel zawsze liczył
// pieniądze od klientów, także nad listą kosztów, gdzie pytanie brzmi „ile jeszcze
// muszę zapłacić". Nazwa zostaje ta sama na obu zakładkach (decyzja biznesu),
// a kierunek mówi podpis pod kwotą.
//
// Domyślnie netto, jak sąsiednie kafle (przychody, koszty, zysk). Brutto - kwota,
// która faktycznie przejdzie przelewem - włącza się przełącznikiem w kaflu.
// Wybór zapamiętuje przeglądarka (useOutstandingBasis).

import { pluralPl } from '@/common/utils';
import type { FinanceSummary } from '../types';

export type OutstandingSide = 'receivables' | 'payables';
export type AmountBasis = 'net' | 'gross';

export interface OutstandingTile {
    label: string;
    /** W groszach. */
    amountCents: number;
    note: string;
    /** Na czym policzono kwotę - brutto może być niedostępne u starszego serwera. */
    basis: AmountBasis;
    /** Czy serwer zna brutto, czyli czy przełącznik ma sens. */
    grossAvailable: boolean;
}

/**
 * `overdue*` z API to LICZBA przeterminowanych dokumentów, nie kwota. Kafel
 * przepuszczał ją kiedyś przez formatMoney, więc trzy zaległe faktury pokazywały
 * się jako „0,03 zł przeterminowane".
 */
const overdueLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'dokument', 'dokumenty', 'dokumentów')} po terminie`;

export function outstandingTile(
    summary: FinanceSummary,
    side: OutstandingSide,
    requested: AmountBasis = 'net',
): OutstandingTile {
    const receivables = side === 'receivables';
    const gross = receivables ? summary.pendingReceivablesGross : summary.pendingPayablesGross;
    const net = receivables ? summary.pendingReceivables : summary.pendingPayables;
    const overdue = receivables ? summary.overdueReceivables : summary.overduePayables;

    // Starszy serwer nie zna brutto - wtedy uczciwie netto, z takim podpisem.
    const grossAvailable = gross !== undefined;
    const basis: AmountBasis = requested === 'gross' && grossAvailable ? 'gross' : 'net';
    const amountCents = basis === 'gross' ? (gross as number) : net;
    const basisWord = basis === 'gross' ? 'brutto' : 'netto';
    const who = receivables ? 'klienci jeszcze nie zapłacili' : 'jeszcze nie zapłaciłeś';

    return {
        label: 'Należności',
        amountCents,
        note: overdue > 0 ? `${basisWord}, w tym ${overdueLabel(overdue)}` : `${basisWord}, ${who}`,
        basis,
        grossAvailable,
    };
}
