// Słowa sekcji „Koszty i zysk": kwoty liczy serwer, tu tylko jak je powiedzieć.
import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/modules/finance/utils/formatters';
import type { VisitCosts } from '../api/visitCostsApi';
import { documentAmount, documentTitle, formatMargin, profitDetails, profitLabel } from './visitCosts';

const costs = (over: Partial<VisitCosts> = {}): VisitCosts => ({
    visitId: 'v-1', visitStatus: 'COMPLETED', revenueBasis: 'SETTLED',
    revenueNet: 154_472, revenueGross: 190_000, costNet: 50_000, costGross: 61_500,
    profitNet: 104_472, marginPercent: 67.6, countedDocuments: 1,
    documents: [{
        document: {
            id: 'c-1', source: 'KSEF', documentKind: 'INVOICE', documentNumber: 'FV/10/2026', ksefNumber: 'K-1',
            saleDate: '2026-10-01T10:00:00Z', sellerName: 'Folie PPF', sellerNip: '5223003098',
            netAmount: 50_000, grossAmount: 61_500, currency: 'PLN', status: 'ACTIVE', isCorrection: false,
            paymentStatus: 'PAID', counted: true, exclusion: null,
        },
        linkedAt: '2026-10-02T10:00:00Z', linkedByName: 'Anna',
    }],
    ...over,
});

describe('visitCosts', () => {
    it('rozpisuje zysk zdaniem z przecinkami, bez kropki-kleju', () => {
        const text = profitDetails(costs());
        expect(text).toBe(`Przychód netto ${formatMoney(154_472)}, koszty netto ${formatMoney(50_000)}, marża 67,6%`);
        expect(text).not.toContain('·');
    });

    it('bez przypiętych kosztów mówi to wprost', () => {
        expect(profitDetails(costs({ documents: [], costNet: 0, profitNet: 154_472 })))
            .toBe(`Przychód netto ${formatMoney(154_472)}, bez przypiętych kosztów`);
    });

    it('wizyta odrzucona nie ma przychodu ani marży', () => {
        const text = profitDetails(costs({ revenueBasis: 'NONE', revenueNet: 0, revenueGross: 0, profitNet: -50_000, marginPercent: null }));
        expect(text).toBe(`Wizyta odrzucona, bez przychodu, koszty netto ${formatMoney(50_000)}`);
    });

    it('przy trwającej wizycie nagłówek uprzedza, że to bieżąca wycena', () => {
        expect(profitLabel('ESTIMATE')).toBe('Zysk netto według bieżącej wyceny');
        expect(profitLabel('SETTLED')).toBe('Zysk netto');
    });

    it('marża po polsku, z jednym miejscem po przecinku', () => {
        expect(formatMargin(67.6)).toBe('67,6%');
        expect(formatMargin(-50)).toBe('-50,0%');
    });

    it('tytuł dokumentu: rodzaj z numerem, korekta nazwana korektą', () => {
        expect(documentTitle({ documentKind: 'INVOICE', documentNumber: 'FV/10/2026', isCorrection: false })).toBe('Faktura FV/10/2026');
        expect(documentTitle({ documentKind: 'RECEIPT', documentNumber: null, isCorrection: false })).toBe('Paragon bez numeru');
        expect(documentTitle({ documentKind: 'INVOICE', documentNumber: 'KOR/1', isCorrection: true })).toBe('Korekta KOR/1');
    });

    it('dokument bez kwoty nie udaje zera, a obca waluta zostaje w swojej walucie', () => {
        expect(documentAmount(null, 'PLN')).toBeNull();
        expect(documentAmount(50_000, 'EUR')).toBe(formatMoney(50_000, 'EUR'));
    });
});
