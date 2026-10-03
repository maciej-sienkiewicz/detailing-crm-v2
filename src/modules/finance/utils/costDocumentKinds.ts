// src/modules/finance/utils/costDocumentKinds.ts
//
// Rodzaj dokumentu kosztowego (backend: ksef_invoices.document_kind, V176).
//
// Z KSeF przychodzą tylko faktury. Ręcznie dodaje się każdy koszt firmy - paragon za
// paliwo, rachunek od osoby bez VAT, opłatę bankową - i każdy trafia do statystyk
// „Pozycje kosztowe" tak samo jak faktura. Etykiety w jednym miejscu, bo czytają je
// lista dokumentów, okno dodawania i statystyki kosztów.

import type { CostDocumentKind } from '../types';

export const COST_DOCUMENT_KIND_LABEL: Record<CostDocumentKind, string> = {
    INVOICE: 'Faktura',
    RECEIPT: 'Paragon',
    BILL: 'Rachunek',
    OTHER: 'Inny dokument',
};

export const COST_DOCUMENT_KINDS: CostDocumentKind[] = ['INVOICE', 'RECEIPT', 'BILL', 'OTHER'];

/** Rodzaj z odpowiedzi API; starszy backend go nie zwracał - wtedy to faktura. */
export const costDocumentKindOf = (kind: string | null | undefined): CostDocumentKind =>
    kind === 'RECEIPT' || kind === 'BILL' || kind === 'OTHER' ? kind : 'INVOICE';

/** Podpowiedź pola „Czego dotyczy" - po tej nazwie koszt grupuje się w statystykach. */
export const COST_DESCRIPTION_PLACEHOLDER: Record<CostDocumentKind, string> = {
    INVOICE: 'np. środki czyszczące, serwis kompresora',
    RECEIPT: 'np. paliwo, drobne zakupy',
    BILL: 'np. usługa sprzątania, wynajem',
    OTHER: 'np. opłata bankowa, mandat, abonament',
};
