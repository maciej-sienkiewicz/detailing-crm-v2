import { describe, expect, it } from 'vitest';
import { handoverAction, type HandoverActionInput } from './handoverAction';

const input = (overrides: Partial<HandoverActionInput> = {}): HandoverActionInput => ({
    isFreeVisit: false,
    canIssueDocuments: true,
    documentType: 'INVOICE',
    hasOtherDocument: false,
    invoicedExternally: false,
    sendToKsef: true,
    gross: '1700,00 zł',
    invoiceGross: '1200,00 zł',
    remainder: '500,00 zł',
    buyerName: 'Flota Serwis Sp. z o.o.',
    paymentLabel: 'Karta',
    ...overrides,
});

describe('handoverAction - przycisk nazwany skutkiem i kwotą', () => {
    it('faktura do KSeF: co się stanie, kwota i nabywca', () => {
        expect(handoverAction(input())).toEqual({
            title: 'Wydaj auto i wyślij fakturę do KSeF',
            detail: '1700,00 zł dla Flota Serwis Sp. z o.o.',
        });
    });

    it('zlecenie zbiorcze: auto trafia do kontrahenta, bez dokumentu i płatności', () => {
        expect(handoverAction(input({ batchContractor: { name: 'Flota-Trans' } }))).toEqual({
            title: 'Wydaj auto i dopisz do zlecenia zbiorczego',
            detail: '1700,00 zł na liście kontrahenta Flota-Trans',
        });
    });

    it('zlecenie zbiorcze bez kontrahenta mówi, czego brakuje', () => {
        expect(handoverAction(input({ batchContractor: { name: null } })).detail).toBe('1700,00 zł, wybierz kontrahenta');
    });

    it('faktura bez wysyłki nie obiecuje KSeF', () => {
        expect(handoverAction(input({ sendToKsef: false })).title).toBe('Wydaj auto i wystaw fakturę');
    });

    it('Faktura + Inny dokument: kwota faktury i reszta gotówką', () => {
        expect(handoverAction(input({ hasOtherDocument: true }))).toEqual({
            title: 'Wydaj auto i wyślij fakturę na 1200,00 zł',
            detail: 'Pozostałe 500,00 zł gotówką na innym dokumencie',
        });
    });

    it('faktury wystawia księgowość: zapis płatności, bez słowa o KSeF', () => {
        const action = handoverAction(input({ invoicedExternally: true }));
        expect(action).toEqual({ title: 'Wydaj auto i zapisz płatność 1700,00 zł', detail: 'Fakturę wystawi księgowość' });
    });

    it('paragon i inne rozliczenie z formą zapłaty', () => {
        expect(handoverAction(input({ documentType: 'RECEIPT' }))).toEqual({
            title: 'Wydaj auto i przyjmij 1700,00 zł',
            detail: 'Paragon, karta',
        });
        expect(handoverAction(input({ documentType: 'other', paymentLabel: 'Gotówka' })).detail).toBe('Inny dokument, gotówka');
    });

    it('wizyta bezpłatna i studio bez modułu finansów', () => {
        expect(handoverAction(input({ isFreeVisit: true })).title).toBe('Wydaj auto');
        expect(handoverAction(input({ canIssueDocuments: false }))).toEqual({ title: 'Wydaj auto', detail: 'Do zapłaty 1700,00 zł' });
    });
});
