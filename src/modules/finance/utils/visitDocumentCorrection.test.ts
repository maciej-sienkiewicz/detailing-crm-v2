// Zmiana kwoty dokumentu z wydania pojazdu w Finansach idzie przez poprawkę rozliczenia
// wizyty. Testy pilnują, które usługi składają się na dokument, kiedy kwoty zmienić się nie
// da, i że żądanie nie rusza niczego poza cenami - nabywcy, rodzaju dokumentu, formy
// płatności drugiego dokumentu - a cena wpisana jako brutto przechodzi co do grosza.
import { describe, expect, it } from 'vitest';
import type { SettlementDocument, SettlementService, SettlementView } from '@/modules/visits/api/settlementApi';
import { lineFromService, withPriceChange } from '@/modules/visits/utils/settlementLines';
import { localIsoDate } from '@/common/utils/localDate';
import { visitDocumentCorrectionRequest, visitDocumentScope } from './visitDocumentCorrection';

const service = (patch: Partial<SettlementService> = {}): SettlementService => ({
    id: 's-1', name: 'Mycie', vatRate: 23, netCents: 154_472, grossCents: 190_000, grossTyped: true, ...patch,
});

const doc = (patch: Partial<SettlementDocument> = {}): SettlementDocument => ({
    id: 'd-1', number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', paymentMethod: 'CASH',
    paymentMethodLabel: 'Gotówka', totalGross: 190_000, status: 'PAID', issueDate: '2026-10-20',
    active: true, superseded: false, ksefInvoiceId: null, ...patch,
});

const view = (patch: Partial<SettlementView> = {}): SettlementView => ({
    visitId: 'v-1', visitStatus: 'COMPLETED', totalNet: 154_472, totalGross: 190_000,
    documentType: 'RECEIPT', paymentMethod: 'CASH', buyer: null,
    services: [service()], documents: [doc()], invoices: [], history: [], ...patch,
});

/** Faktura + reszta bez VAT, z zapisanym podziałem usług na dokumenty. */
const splitView = () => view({
    documentType: 'INVOICE',
    paymentMethod: 'TRANSFER',
    perDocument: true,
    services: [
        service({ id: 's-1', name: 'Powłoka', netCents: 300_000, grossCents: 369_000, grossTyped: false }),
        service({ id: 's-2', name: 'Mycie', netCents: 20_000, grossCents: 24_600, grossTyped: false }),
    ],
    documents: [
        doc({ id: 'inv', number: 'FAK/2026/0001', type: 'INVOICE', typeLabel: 'Faktura', paymentMethod: 'TRANSFER',
            totalGross: 369_000, services: [{ serviceLineItemId: 's-1', name: 'Powłoka', grossCents: 369_000 }] }),
        doc({ id: 'rest', number: 'DOK/2026/0002', type: 'OTHER', typeLabel: 'Inny dokument', paymentMethod: 'CASH',
            totalGross: 20_000, withoutReceipt: true, services: [{ serviceLineItemId: 's-2', name: 'Mycie', grossCents: 24_600 }] }),
    ],
});

describe('visitDocumentScope', () => {
    it('jedyny dokument wizyty rozlicza wszystkie jej usługi', () => {
        const scope = visitDocumentScope(view({ services: [service(), service({ id: 's-2' })] }), 'd-1');
        expect(scope.lock).toBeNull();
        expect(scope.services.map(s => s.id)).toEqual(['s-1', 's-2']);
        expect(scope.alsoAffected).toEqual([]);
    });

    it('przy podziale z alokacją dokument ma tylko swoje usługi, drugi dokument zostaje', () => {
        const scope = visitDocumentScope(splitView(), 'rest');
        expect(scope.services.map(s => s.id)).toEqual(['s-2']);
        expect(scope.alsoAffected).toEqual([]);
    });

    it('bez zapisanego podziału zmiana dotyczy całej wizyty i okno wie, które dokumenty jeszcze', () => {
        const scope = visitDocumentScope(view({
            documents: [doc(), doc({ id: 'd-2', number: 'DOK/2026/0003', type: 'OTHER' })],
        }), 'd-1');
        expect(scope.lock).toBeNull();
        expect(scope.alsoAffected.map(d => d.number)).toEqual(['DOK/2026/0003']);
    });

    it('korekta i dokument zastąpiony nie biorą udziału w liczeniu „innych dokumentów”', () => {
        const scope = visitDocumentScope(view({
            documents: [
                doc(),
                doc({ id: 'old', active: false, superseded: true }),
                doc({ id: 'kor', type: 'CORRECTION', totalGross: -190_000 }),
            ],
        }), 'd-1');
        expect(scope.alsoAffected).toEqual([]);
    });

    it('dokument zastąpiony w międzyczasie, korekta i dokument spoza rozliczenia są zablokowane', () => {
        const v = view({ documents: [doc({ active: false, superseded: true }), doc({ id: 'kor', type: 'CORRECTION' })] });
        expect(visitDocumentScope(v, 'd-1').lock).toBe('NOT_IN_SETTLEMENT');
        expect(visitDocumentScope(v, 'kor').lock).toBe('NOT_IN_SETTLEMENT');
        expect(visitDocumentScope(v, 'missing').lock).toBe('NOT_IN_SETTLEMENT');
    });

    it('zlecenie zbiorcze i wizyta bez usług są zablokowane', () => {
        const batch = { entryId: 'e', contractorId: 'c', contractorName: 'Flota', settled: false };
        expect(visitDocumentScope(view({ batch }), 'd-1').lock).toBe('BATCH');
        expect(visitDocumentScope(view({ services: [] }), 'd-1').lock).toBe('NO_SERVICES');
    });
});

describe('visitDocumentCorrectionRequest', () => {
    const edit = { paymentMethod: 'CASH' as const, dueDate: '' };

    it('wysyła tylko zmienione usługi, a brutto wpisane przez człowieka co do grosza (1900,00, nie 1900,01)', () => {
        const v = view({ services: [service(), service({ id: 's-2', name: 'Odkurzanie', netCents: 8_130, grossCents: 10_000 })] });
        const scope = visitDocumentScope(v, 'd-1');
        const lines = scope.services.map(lineFromService);
        lines[1] = withPriceChange(lines[1], { gross: '1900,00' });

        const request = visitDocumentCorrectionRequest(v, scope, lines, edit, 'PAR/2026/0007');

        expect(request.services).toEqual([{ serviceLineItemId: 's-2', netCents: 154_472, grossCents: 190_000, vatRate: 23 }]);
    });

    it('nie zmienia nabywcy ani rodzaju dokumentu, a powód mówi, skąd przyszła zmiana', () => {
        const v = view({ documentType: 'INVOICE', buyer: { nip: '5270000000', name: 'Firma' } });
        const scope = visitDocumentScope(v, 'd-1');
        const request = visitDocumentCorrectionRequest(v, scope, scope.services.map(lineFromService), edit, 'FAK/2026/0001');

        expect(request.buyer).toBeNull();
        expect(request.documentType).toBe('INVOICE');
        expect(request.reason).toBe('Zmiana kwoty dokumentu FAK/2026/0001 w Finansach');
    });

    it('przelew bez terminu w oknie bierze termin obowiązującej faktury', () => {
        const v = view({ paymentDueDate: '2099-11-03' });
        const scope = visitDocumentScope(v, 'd-1');
        const request = visitDocumentCorrectionRequest(v, scope, [], { paymentMethod: 'TRANSFER', dueDate: '' }, 'X');
        expect(request.dueDate).toBe('2099-11-03');
        expect(visitDocumentCorrectionRequest(v, scope, [], { paymentMethod: 'TRANSFER', dueDate: '2099-12-01' }, 'X').dueDate)
            .toBe('2099-12-01');
        expect(visitDocumentCorrectionRequest(v, scope, [], edit, 'X').dueDate).toBeNull();
    });

    it('termin, który już minął, przeniesiony ze starego dokumentu przechodzi na dziś', () => {
        // Nowy dokument poprawki ma dzisiejszą datę, a serwer odrzuca termin sprzed daty wystawienia.
        const today = localIsoDate();
        const v = view({ paymentDueDate: '2020-01-10' });
        const scope = visitDocumentScope(v, 'd-1');

        expect(visitDocumentCorrectionRequest(v, scope, [], { paymentMethod: 'TRANSFER', dueDate: '' }, 'X').dueDate)
            .toBe(today);
        expect(visitDocumentCorrectionRequest(v, scope, [],
            { paymentMethod: 'TRANSFER', dueDate: '2020-01-10', dueDateCarried: true }, 'X').dueDate).toBe(today);
        // Wpisany przez człowieka idzie bez zmian - serwer powie, co z nim nie tak.
        expect(visitDocumentCorrectionRequest(v, scope, [],
            { paymentMethod: 'TRANSFER', dueDate: '2020-01-10', dueDateCarried: false }, 'X').dueDate).toBe('2020-01-10');
    });

    it('przy podziale forma płatności zmienia się tylko przy edytowanym dokumencie, główna jest z faktury', () => {
        const v = splitView();
        const scope = visitDocumentScope(v, 'rest');
        const request = visitDocumentCorrectionRequest(v, scope, scope.services.map(lineFromService),
            { paymentMethod: 'CARD', dueDate: '' }, 'DOK/2026/0002');

        expect(request.documentPaymentMethods).toEqual({ inv: 'TRANSFER', rest: 'CARD' });
        expect(request.paymentMethod).toBe('TRANSFER');
    });

    it('usługa zwolniona z VAT na fakturze powtarza podstawę zwolnienia, ale nie przy fakturach od księgowości', () => {
        const v = view({ documentType: 'INVOICE', exemptionLegalBasis: 'art. 113 ust. 1', services: [service({ vatRate: -1 })] });
        const scope = visitDocumentScope(v, 'd-1');
        const lines = scope.services.map(lineFromService);
        expect(visitDocumentCorrectionRequest(v, scope, lines, edit, 'X').exemptionLegalBasis).toBe('art. 113 ust. 1');

        const external = { ...v, invoicesIssuedExternally: true };
        expect(visitDocumentCorrectionRequest(external, scope, lines, edit, 'X').exemptionLegalBasis).toBeNull();
    });
});
