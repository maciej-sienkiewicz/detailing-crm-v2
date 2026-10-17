// src/modules/visits/utils/visitCosts.ts
//
// Słowa sekcji „Koszty i zysk". Kwot nie liczy tu nic - zysk, koszty i marżę podaje
// serwer, tą samą regułą co finanse (brakująca strona kwoty, waluta, dokumenty ukryte).
// Tu jest wyłącznie to, jak je powiedzieć: zdaniem z przecinkami, nie ciągiem
// sklejonym kropką (CLAUDE.md §4).

import { formatMoney } from '@/modules/finance/utils/formatters';
import { COST_DOCUMENT_KIND_LABEL, costDocumentKindOf } from '@/modules/finance/utils/costDocumentKinds';
import type { CostDocument, CostExclusion, RevenueBasis, VisitCosts } from '../api/visitCostsApi';

/** Dlaczego dokument nie wchodzi do sumy - pełnym zdaniem, bo stoi w plakietce obok kwoty. */
export const EXCLUSION_LABEL: Record<CostExclusion, string> = {
    HIDDEN: 'Ukryty w finansach, nie liczy się',
    CANCELLED: 'Anulowany, nie liczy się',
    FOREIGN_CURRENCY: 'Waluta obca, poza sumą',
};

/** Nagłówek paska: przy trwającej wizycie przychód może się jeszcze zmienić - mówimy to od razu. */
export const profitLabel = (basis: RevenueBasis): string =>
    basis === 'ESTIMATE' ? 'Zysk netto według bieżącej wyceny' : 'Zysk netto';

/** 67.6 → „67,6%". */
export const formatMargin = (marginPercent: number): string =>
    `${marginPercent.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Rozpisanie zysku pod kwotą: skąd się wziął, zwykłym zdaniem. */
export function profitDetails(costs: VisitCosts): string {
    const revenue = costs.revenueBasis === 'NONE'
        ? 'Wizyta odrzucona, bez przychodu'
        : `Przychód netto ${formatMoney(costs.revenueNet)}`;

    if (costs.documents.length === 0) return `${revenue}, bez przypiętych kosztów`;

    const parts = [revenue, `koszty netto ${formatMoney(costs.costNet)}`];
    if (costs.marginPercent !== null) parts.push(`marża ${formatMargin(costs.marginPercent)}`);
    return parts.join(', ');
}

/** „Faktura FV/10/2026", „Paragon bez numeru". */
export function documentTitle(doc: Pick<CostDocument, 'documentKind' | 'documentNumber' | 'isCorrection'>): string {
    const kind = doc.isCorrection ? 'Korekta' : COST_DOCUMENT_KIND_LABEL[costDocumentKindOf(doc.documentKind)];
    return doc.documentNumber ? `${kind} ${doc.documentNumber}` : `${kind} bez numeru`;
}

/** Kwota dokumentu w jego walucie; dokument bez kwoty mówi to wprost zamiast udawać zero. */
export const documentAmount = (cents: number | null, currency: string): string | null =>
    cents === null ? null : formatMoney(cents, currency || 'PLN');
