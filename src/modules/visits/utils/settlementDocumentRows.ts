// src/modules/visits/utils/settlementDocumentRows.ts
//
// „Obecne rozliczenie” w oknie poprawki: jedna sprzedaż = jeden wiersz.
//
// Faktura wystawiona przy wydaniu pojazdu istnieje w dwóch miejscach: w KSeF
// (FV/2026/0006 - numer, który dostaje klient) i jako dokument w Finansach
// (FAK/2026/0005 - wewnętrzny zapis z formą płatności i ruchem w kasie, numerowany
// własną serią). Okno pokazywało oba, więc jedna faktura wyglądała jak dwie, a numer
// FAK nie występuje nigdzie indziej - lista przychodów w Finansach też go chowa
// i pokazuje fakturę KSeF. Tu robimy to samo: dokument powiązany z fakturą KSeF
// staje się jej wierszem, z jej numerem i statusem, a z dokumentu bierze formę płatności.

//
// Faktura od księgowości (tryb „Faktury wystawia księgowość”) nie ma rekordu KSeF w CRM:
// dokument jest zapisem płatności, a jego numer FAK/… nie jest numerem faktury. Wiersz
// pokazuje wtedy numer faktury księgowości, jeśli go wpisano przy odhaczeniu, i stan
// zgłoszenia. Czekające korekty dla księgowości dochodzą osobnymi wierszami - to one
// mówią, że stara faktura księgowości jeszcze obowiązuje, dopóki ktoś jej nie skoryguje.

import type { SettlementExternalInvoice, SettlementView } from '../api/settlementApi';

export interface SettlementDocumentRow {
    key: string;
    number: string;
    label: string;
    paymentMethodLabel: string | null;
    /** Status faktury w KSeF; null dla paragonu i dokumentu bez faktury KSeF. */
    ksefStatus: string | null;
    /** Stan zgłoszenia dla księgowości; null, gdy fakturę wystawia CRM albo jej nie ma. */
    externalStatus: 'PENDING' | 'ISSUED' | null;
    totalGross: number;
}

export function settlementDocumentRows(
    view: Pick<SettlementView, 'documents' | 'invoices' | 'externalInvoices'>,
): SettlementDocumentRow[] {
    const invoicesById = new Map(view.invoices.map(inv => [inv.id, inv]));
    const requests = (view.externalInvoices ?? []).filter(
        (r): r is SettlementExternalInvoice & { status: 'PENDING' | 'ISSUED' } => r.status !== 'WITHDRAWN',
    );
    const shown = new Set<string>();
    const rows: SettlementDocumentRow[] = [];

    for (const doc of view.documents.filter(d => d.active)) {
        const invoice = doc.ksefInvoiceId ? invoicesById.get(doc.ksefInvoiceId) : undefined;
        const request = requests.find(r => r.documentId === doc.id && r.kind !== 'CORRECTION');
        if (request) {
            const toReceipt = request.kind === 'INVOICE_TO_RECEIPT';
            rows.push({
                key: doc.id,
                // Paragon ma swój numer, który klient widział; faktura od księgowości ma
                // tylko ten, który ktoś wpisał przy odhaczeniu.
                number: toReceipt ? doc.number : request.externalInvoiceNumber ?? 'Faktura księgowości',
                label: toReceipt ? `${doc.typeLabel}, faktura do paragonu od księgowości` : 'Faktura od księgowości',
                paymentMethodLabel: doc.paymentMethodLabel,
                ksefStatus: null,
                externalStatus: request.status,
                totalGross: doc.totalGross,
            });
        } else if (invoice) {
            shown.add(invoice.id);
            rows.push({
                key: doc.id,
                number: invoice.number,
                label: invoice.invoiceToReceipt ? 'Faktura do paragonu' : 'Faktura',
                paymentMethodLabel: doc.paymentMethodLabel,
                ksefStatus: invoice.status,
                externalStatus: null,
                totalGross: doc.totalGross,
            });
        } else {
            rows.push({
                key: doc.id,
                number: doc.number,
                label: doc.typeLabel,
                paymentMethodLabel: doc.paymentMethodLabel,
                ksefStatus: null,
                externalStatus: null,
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
            externalStatus: null,
            totalGross: invoice.totalGross,
        });
    }

    // Korekty, które księgowość ma dopiero wystawić: stara faktura księgowości obowiązuje,
    // dopóki korekty nie ma. Wystawione korekty to już historia.
    for (const correction of requests.filter(r => r.kind === 'CORRECTION' && r.status === 'PENDING')) {
        rows.push({
            key: correction.id,
            number: correction.externalInvoiceNumber ?? 'Korekta faktury księgowości',
            label: 'Korekta do wystawienia przez księgowość',
            paymentMethodLabel: null,
            ksefStatus: null,
            externalStatus: correction.status,
            totalGross: correction.totalGross,
        });
    }
    return rows;
}
