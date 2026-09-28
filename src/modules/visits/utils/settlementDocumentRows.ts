// src/modules/visits/utils/settlementDocumentRows.ts
//
// „Obecne rozliczenie" w oknie poprawki: jedna sprzedaż = jeden wiersz.
//
// Faktura wystawiona przy wydaniu pojazdu istnieje w dwóch miejscach: w KSeF
// (FV/2026/0006 - numer, który dostaje klient) i jako dokument w Finansach
// (FAK/2026/0005 - wewnętrzny zapis z formą płatności i ruchem w kasie, numerowany
// własną serią). Okno pokazywało oba, więc jedna faktura wyglądała jak dwie, a numer
// FAK nie występuje nigdzie indziej - lista przychodów w Finansach też go chowa
// i pokazuje fakturę KSeF. Tu robimy to samo: dokument powiązany z fakturą KSeF
// staje się jej wierszem, z jej numerem i statusem, a z dokumentu bierze formę płatności.

import type { SettlementView } from '../api/settlementApi';

export interface SettlementDocumentRow {
    key: string;
    number: string;
    label: string;
    paymentMethodLabel: string | null;
    /** Status faktury w KSeF; null dla paragonu i dokumentu bez faktury KSeF. */
    ksefStatus: string | null;
    totalGross: number;
}

export function settlementDocumentRows(view: Pick<SettlementView, 'documents' | 'invoices'>): SettlementDocumentRow[] {
    const invoicesById = new Map(view.invoices.map(inv => [inv.id, inv]));
    const shown = new Set<string>();
    const rows: SettlementDocumentRow[] = [];

    for (const doc of view.documents.filter(d => d.active)) {
        const invoice = doc.ksefInvoiceId ? invoicesById.get(doc.ksefInvoiceId) : undefined;
        if (invoice) {
            shown.add(invoice.id);
            rows.push({
                key: doc.id,
                number: invoice.number,
                label: invoice.invoiceToReceipt ? 'Faktura do paragonu' : 'Faktura',
                paymentMethodLabel: doc.paymentMethodLabel,
                ksefStatus: invoice.status,
                totalGross: doc.totalGross,
            });
        } else {
            rows.push({
                key: doc.id,
                number: doc.number,
                label: doc.typeLabel,
                paymentMethodLabel: doc.paymentMethodLabel,
                ksefStatus: null,
                totalGross: doc.totalGross,
            });
        }
    }

    // Faktury bez własnego dokumentu w Finansach - np. faktura do paragonu, którego
    // kwota weszła już paragonem.
    for (const invoice of view.invoices.filter(i => i.active && !shown.has(i.id))) {
        rows.push({
            key: invoice.id,
            number: invoice.number,
            label: invoice.invoiceToReceipt ? 'Faktura do paragonu' : 'Faktura',
            paymentMethodLabel: null,
            ksefStatus: invoice.status,
            totalGross: invoice.totalGross,
        });
    }
    return rows;
}
