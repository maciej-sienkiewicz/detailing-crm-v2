// Zgłoszenie: okno „Popraw rozliczenie" pokazywało przy jednej fakturze dwa numery -
// FAK/2026/0005 (wewnętrzny dokument Finansów) i FV/2026/0006 (faktura KSeF).
import { describe, expect, it } from 'vitest';
import { settlementDocumentRows } from './settlementDocumentRows';
import type { SettlementDocument, SettlementExternalInvoice, SettlementInvoice } from '../api/settlementApi';

const doc = (patch: Partial<SettlementDocument>): SettlementDocument => ({
    id: 'd-1', number: 'FAK/2026/0005', type: 'INVOICE', typeLabel: 'Faktura', paymentMethod: 'CARD',
    paymentMethodLabel: 'Karta', totalGross: 50_000, status: 'PAID', issueDate: '2026-09-28',
    active: true, superseded: false, ksefInvoiceId: null, ...patch,
});
const invoice = (patch: Partial<SettlementInvoice>): SettlementInvoice => ({
    id: 'k-1', number: 'FV/2026/0006', ksefNumber: null, type: 'VAT', status: 'NOT_SENT',
    invoiceToReceipt: false, totalGross: 50_000, active: true, buyerNip: null, buyerName: 'Jan Kowalski', ...patch,
});

const request = (patch: Partial<SettlementExternalInvoice>): SettlementExternalInvoice => ({
    id: 'r-1', documentId: 'd-1', kind: 'INVOICE', kindLabel: 'Faktura', status: 'PENDING', statusLabel: 'Do wystawienia',
    externalInvoiceNumber: null, totalGross: 190_000, buyerNip: null, buyerName: 'Auto Serwis', ...patch,
});

describe('settlementDocumentRows', () => {
    it('faktura z dokumentem w Finansach to jeden wiersz z numerem KSeF i formą płatności', () => {
        const rows = settlementDocumentRows({ documents: [doc({ ksefInvoiceId: 'k-1' })], invoices: [invoice({})] });
        expect(rows).toEqual([expect.objectContaining({
            number: 'FV/2026/0006', label: 'Faktura', paymentMethodLabel: 'Karta', ksefStatus: 'NOT_SENT', totalGross: 50_000,
        })]);
    });

    it('paragon z fakturą do paragonu: dwa wiersze, bo to dwa dokumenty dla klienta', () => {
        const rows = settlementDocumentRows({
            documents: [doc({ id: 'd-2', number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', paymentMethodLabel: 'Gotówka' })],
            invoices: [invoice({ invoiceToReceipt: true, status: 'ACCEPTED' })],
        });
        expect(rows.map(r => [r.number, r.label])).toEqual([
            ['PAR/2026/0007', 'Paragon'],
            ['FV/2026/0006', 'Faktura do paragonu'],
        ]);
    });

    it('dokument faktury bez rekordu KSeF zostaje ze swoim numerem', () => {
        const rows = settlementDocumentRows({ documents: [doc({})], invoices: [] });
        expect(rows).toEqual([expect.objectContaining({ number: 'FAK/2026/0005', ksefStatus: null })]);
    });

    it('dokumenty i faktury, które już nie obowiązują, nie wchodzą do obecnego rozliczenia', () => {
        const rows = settlementDocumentRows({
            documents: [doc({ active: false, superseded: true, ksefInvoiceId: 'k-1' })],
            invoices: [invoice({ active: false, status: 'CANCELLED' })],
        });
        expect(rows).toEqual([]);
    });

    describe('faktury wystawia księgowość', () => {
        it('czekająca faktura: bez numeru FAK, który nie jest numerem faktury', () => {
            const rows = settlementDocumentRows({
                documents: [doc({ totalGross: 190_000, invoicedExternally: true })],
                invoices: [],
                externalInvoices: [request({})],
            });
            expect(rows).toEqual([expect.objectContaining({
                number: 'Faktura księgowości', label: 'Faktura od księgowości', externalStatus: 'PENDING', ksefStatus: null,
            })]);
        });

        it('wystawiona faktura pokazuje numer wpisany przy odhaczeniu', () => {
            const rows = settlementDocumentRows({
                documents: [doc({ invoicedExternally: true })],
                invoices: [],
                externalInvoices: [request({ status: 'ISSUED', externalInvoiceNumber: 'FV 12/09/2026' })],
            });
            expect(rows[0]).toEqual(expect.objectContaining({ number: 'FV 12/09/2026', externalStatus: 'ISSUED' }));
        });

        it('faktura do paragonu od księgowości zostaje przy numerze paragonu', () => {
            const rows = settlementDocumentRows({
                documents: [doc({ number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', invoicedExternally: true })],
                invoices: [],
                externalInvoices: [request({ kind: 'INVOICE_TO_RECEIPT' })],
            });
            expect(rows[0]).toEqual(expect.objectContaining({ number: 'PAR/2026/0007', externalStatus: 'PENDING' }));
            expect(rows[0].label).toContain('faktura do paragonu od księgowości');
        });

        it('czekająca korekta dla księgowości to osobny wiersz z kwotą ujemną, wycofane zgłoszenia znikają', () => {
            const rows = settlementDocumentRows({
                documents: [doc({ id: 'd-2', number: 'PAR/2026/0008', type: 'RECEIPT', typeLabel: 'Paragon' })],
                invoices: [],
                externalInvoices: [
                    request({ status: 'WITHDRAWN' }),
                    request({ id: 'r-2', documentId: 'd-9', kind: 'CORRECTION', totalGross: -190_000 }),
                ],
            });
            expect(rows.map(r => [r.number, r.totalGross, r.externalStatus])).toEqual([
                ['PAR/2026/0008', 50_000, null],
                ['Korekta faktury księgowości', -190_000, 'PENDING'],
            ]);
        });
    });
});
