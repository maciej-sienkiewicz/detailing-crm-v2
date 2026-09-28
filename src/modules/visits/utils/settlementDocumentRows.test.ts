// Zgłoszenie: okno „Popraw rozliczenie" pokazywało przy jednej fakturze dwa numery -
// FAK/2026/0005 (wewnętrzny dokument Finansów) i FV/2026/0006 (faktura KSeF).
import { describe, expect, it } from 'vitest';
import { settlementDocumentRows } from './settlementDocumentRows';
import type { SettlementDocument, SettlementInvoice } from '../api/settlementApi';

const doc = (patch: Partial<SettlementDocument>): SettlementDocument => ({
    id: 'd-1', number: 'FAK/2026/0005', type: 'INVOICE', typeLabel: 'Faktura', paymentMethod: 'CARD',
    paymentMethodLabel: 'Karta', totalGross: 50_000, status: 'PAID', issueDate: '2026-09-28',
    active: true, superseded: false, ksefInvoiceId: null, ...patch,
});
const invoice = (patch: Partial<SettlementInvoice>): SettlementInvoice => ({
    id: 'k-1', number: 'FV/2026/0006', ksefNumber: null, type: 'VAT', status: 'NOT_SENT',
    invoiceToReceipt: false, totalGross: 50_000, active: true, buyerNip: null, buyerName: 'Jan Kowalski', ...patch,
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
});
