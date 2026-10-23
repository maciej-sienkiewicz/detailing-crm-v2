// @vitest-environment jsdom
//
// Okno „Popraw rozliczenie": podgląd skutków z serwera przed zapisem, blokada, gdy
// serwer mówi, że się nie da, i zapis z wpisanym brutto co do grosza (CLAUDE.md §1).
// Układ jak krok płatności „Wydanie pojazdu”: tabela cen z wydania, podsumowanie
// po prawej, przycisk z dwiema liniami (nazwa dostępna zaczyna się od czynności).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SettlementCorrectionModal } from './SettlementCorrectionModal';
import { settlementApi, type SettlementView } from '../api/settlementApi';

vi.mock('../api/settlementApi', () => ({
    settlementApi: { get: vi.fn(), preview: vi.fn(), correct: vi.fn() },
}));

const view: SettlementView = {
    visitId: 'v-1', visitStatus: 'COMPLETED', totalNet: 154_472, totalGross: 190_000,
    documentType: 'RECEIPT', paymentMethod: 'CASH', buyer: null,
    services: [{ id: 's-1', name: 'Przygotowanie do sprzedaży', vatRate: 23, netCents: 154_472, grossCents: 190_000, grossTyped: true }],
    documents: [{
        id: 'd-1', number: 'PAR/2026/0007', type: 'RECEIPT', typeLabel: 'Paragon', paymentMethod: 'CASH',
        paymentMethodLabel: 'Gotówka', totalGross: 190_000, status: 'PAID', issueDate: '2026-09-20',
        active: true, superseded: false, ksefInvoiceId: null,
    }],
    invoices: [], history: [],
};

const renderModal = (intent?: 'correct' | 'invoice') => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SettlementCorrectionModal visitId="v-1" intent={intent} onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return onClose;
};

describe('SettlementCorrectionModal', () => {
    beforeEach(() => {
        vi.mocked(settlementApi.get).mockResolvedValue(view);
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: ['Kwota wizyty: 1900,00 zł → 1700,00 zł brutto.', 'Zwrot dla klienta: 200,00 zł.'],
            blockReason: null, totalGrossBefore: 190_000, totalGrossAfter: 170_000, customerDifference: -20_000, cashDelta: -20_000,
        });
        vi.mocked(settlementApi.correct).mockResolvedValue({ correctionId: 'c-1', steps: [], ksefError: null });
    });
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('pokazuje skutki z serwera i zapisuje wpisane brutto co do grosza', async () => {
        const onClose = renderModal();
        const gross = await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży');
        fireEvent.change(gross, { target: { value: '1700,00' } });

        await waitFor(() => expect(settlementApi.preview).toHaveBeenLastCalledWith('v-1', expect.objectContaining({
            services: [{ serviceLineItemId: 's-1', netCents: 138_211, grossCents: 170_000, vatRate: 23 }],
        })));

        // Sekcji „Co się stanie" nie ma (decyzja biznesu): kroki planu nie są pokazywane.
        expect(screen.queryByText('Co się stanie')).toBeNull();
        expect(screen.queryByText('Zwrot dla klienta: 200,00 zł.')).toBeNull();

        const submit = screen.getByRole('button', { name: /^Zatwierdź poprawkę/ });
        await waitFor(() => expect(submit).toBeEnabled());
        fireEvent.click(submit);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(vi.mocked(settlementApi.correct).mock.calls[0][1].services[0].grossCents).toBe(170_000);
    });

    it('linia kasy i kwoty dla klienta jest widoczna przed zatwierdzeniem', async () => {
        renderModal();
        fireEvent.change(await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży'), { target: { value: '1700,00' } });
        const aside = screen.getByLabelText('Podsumowanie poprawki');
        await waitFor(() => expect(aside.textContent).toMatch(/Klientdostaje zwrot 200,00\szł/));
        expect(aside.textContent).toMatch(/Kasa−200,00\szł/);
        expect(aside.textContent).toMatch(/Do zapłaty1\s?700,00\szłbyło 1\s?900,00\szł/);
        expect(screen.getByRole('button', { name: /^Zatwierdź poprawkę/ }).textContent).toMatch(/Paragon, gotówka, zwrot 200,00\szł/);
    });

    it('wizyta z podziałem: forma płatności przy każdym dokumencie, zmiana tylko reszty', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({
            ...view,
            documentType: 'INVOICE', paymentMethod: 'CARD', perDocument: true,
            buyer: { name: 'Jan Kowalski' },
            documents: [
                { ...view.documents[0], id: 'd-fv', number: 'FAK/2026/0001', type: 'INVOICE', typeLabel: 'Faktura', paymentMethod: 'CARD', paymentMethodLabel: 'Karta', totalGross: 160_000,
                  services: [{ serviceLineItemId: 's-1', name: 'Przygotowanie do sprzedaży', grossCents: 160_000 }] },
                { ...view.documents[0], id: 'd-rest', number: 'DOK/2026/0002', type: 'OTHER', typeLabel: 'Inny dokument', paymentMethod: 'CASH', paymentMethodLabel: 'Gotówka', totalGross: 30_000, withoutReceipt: true,
                  services: [{ serviceLineItemId: 's-1', name: 'Przygotowanie do sprzedaży', grossCents: 30_000 }] },
            ],
        });
        renderModal();
        const rest = (await screen.findByText('Inny dokument DOK/2026/0002')).closest('div')!;
        // Inny dokument jest bez VAT: jego kwota to netto, nie „brutto”.
        expect(rest).toHaveTextContent(/300,00\szł bez VAT/);
        expect(screen.queryByText(/Bez paragonu/i)).toBeNull();
        fireEvent.click(within(rest).getByRole('button', { name: /Karta/ }));

        await waitFor(() => expect(settlementApi.preview).toHaveBeenLastCalledWith('v-1', expect.objectContaining({
            paymentMethod: 'CARD',
            documentPaymentMethods: { 'd-fv': 'CARD', 'd-rest': 'CARD' },
        })));
    });

    it('gdy serwer blokuje poprawkę, pokazuje powód i nie pozwala zatwierdzić', async () => {
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: [], blockReason: 'Faktura FV/2026/0003 czeka na odpowiedź KSeF.',
            totalGrossBefore: 190_000, totalGrossAfter: 190_000, customerDifference: 0, cashDelta: 0,
        });
        renderModal();
        fireEvent.change(await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży'), { target: { value: '1800,00' } });

        expect(await screen.findByText('Faktura FV/2026/0003 czeka na odpowiedź KSeF.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Zatwierdź poprawkę/ })).toBeDisabled();
    });

    it('wizyta z fakturą bez zmian też nie pyta serwera - nabywca z faktury to nie zmiana', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({
            ...view, documentType: 'INVOICE', paymentMethod: 'CARD', buyer: { nip: '5272976544', name: 'Flota Serwis Sp. z o.o.' },
        });
        renderModal();
        expect(await screen.findByText('Flota Serwis Sp. z o.o.')).toBeInTheDocument();
        await new Promise(resolve => setTimeout(resolve, 450));
        expect(settlementApi.preview).not.toHaveBeenCalled();
        expect(screen.queryByText('Tej poprawki nie da się teraz wykonać')).toBeNull();
        expect(screen.getByRole('button', { name: /^Zatwierdź poprawkę/ })).toBeDisabled();
    });

    it('bez zmian nie pyta serwera i nie pozwala zatwierdzić', async () => {
        renderModal();
        expect(await screen.findByText('PAR/2026/0007')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Zatwierdź poprawkę/ })).toBeDisabled();
        expect(screen.queryByText('Tej poprawki nie da się teraz wykonać')).toBeNull();
        expect(settlementApi.preview).not.toHaveBeenCalled();
    });

    it('wizyta bez dokumentu - od razu mozna dopisac paragon', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({ ...view, documentType: null, paymentMethod: null, documents: [] });
        renderModal();

        await waitFor(() => expect(settlementApi.preview).toHaveBeenCalledWith('v-1', expect.objectContaining({
            services: [], documentType: 'RECEIPT',
        })));
        await waitFor(() => expect(screen.getByRole('button', { name: /^Zatwierdź poprawkę/ })).toBeEnabled());
    });

    it('pokazuje obecne dokumenty rozliczenia', async () => {
        renderModal();
        const row = (await screen.findByText('PAR/2026/0007')).closest('li')!;
        expect(row).toHaveTextContent('Paragon');
        expect(row).toHaveTextContent('Gotówka');
        expect(row).toHaveTextContent(/1\s?900,00\s*zł/);
    });

    // Testy KSeF: „Wystaw fakturę konsumencką" kończyło się błędem 400 (kod płatności wizyty
    // zamiast formy FA(3)) i wystawiałoby zwykłą fakturę zamiast faktury do paragonu.
    // Teraz ten przycisk otwiera poprawkę w trybie faktury.
    it('faktura do paragonu: od razu faktura, nabywca z karty klienta, jeden przycisk', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({
            ...view, buyer: { name: 'Rafał Fakturadoparagonu', email: '***' },
        });
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: ['Faktura do paragonu na 1900,00 zł. Paragon zostaje, sprzedaż nie liczy się drugi raz.'],
            blockReason: null, totalGrossBefore: 190_000, totalGrossAfter: 190_000, customerDifference: 0, cashDelta: 0,
        });
        const onClose = renderModal('invoice');

        expect(await screen.findByRole('heading', { name: 'Faktura do paragonu' })).toBeInTheDocument();
        expect(screen.getByText('Paragon zostaje')).toBeInTheDocument();
        // Nabywca jak przy wydaniu: w podsumowaniu, a pola w oknie „Zmień”.
        expect(screen.getByLabelText('Podsumowanie poprawki')).toHaveTextContent('Rafał Fakturadoparagonu');
        fireEvent.click(screen.getByRole('button', { name: 'Zmień' }));
        expect(screen.getByLabelText('Nazwa albo imię i nazwisko')).toHaveValue('Rafał Fakturadoparagonu');
        // Maska PII nigdy nie trafia na dokument.
        expect(screen.getByLabelText('E-mail')).toHaveValue('');
        fireEvent.click(screen.getByRole('button', { name: 'Gotowe' }));

        await waitFor(() => expect(settlementApi.preview).toHaveBeenCalledWith('v-1', expect.objectContaining({
            documentType: 'INVOICE', services: [], paymentMethod: 'CASH',
        })));
        const submit = screen.getByRole('button', { name: /^Wystaw fakturę/ });
        await waitFor(() => expect(submit).toBeEnabled());
        fireEvent.click(submit);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(vi.mocked(settlementApi.correct).mock.calls[0][1]).toMatchObject({
            documentType: 'INVOICE',
            buyer: expect.objectContaining({ name: 'Rafał Fakturadoparagonu', email: '' }),
            reason: 'Klient poprosił o fakturę do paragonu',
        });
    });

    it('podstawa zwolnienia i termin przelewu przechodzą z obowiązującej faktury', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({
            ...view, documentType: 'INVOICE', paymentMethod: 'TRANSFER',
            services: [{ id: 's-1', name: 'Szkolenie', vatRate: -1, netCents: 30_000, grossCents: 30_000, grossTyped: true }],
            exemptionLegalBasis: 'art. 43 ust. 1 pkt 29 lit. c ustawy o VAT', paymentDueDate: '2026-10-30',
        });
        renderModal();
        expect(await screen.findByDisplayValue('art. 43 ust. 1 pkt 29 lit. c ustawy o VAT')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2026-10-30')).toBeInTheDocument();
    });

    // Faktury przyjętej w KSeF nie da się usunąć, a korekty cofnąć: skutek dla faktury stoi
    // w podsumowaniu przed zatwierdzeniem, choć zdań planu okno nie pokazuje.
    it('przed zatwierdzeniem widać, co poprawka zrobi z fakturą w KSeF', async () => {
        vi.mocked(settlementApi.get).mockResolvedValue({ ...view, documentType: 'INVOICE', paymentMethod: 'CARD', buyer: { name: 'Jan Kowalski' } });
        vi.mocked(settlementApi.preview).mockResolvedValue({
            steps: [], blockReason: null, totalGrossBefore: 190_000, totalGrossAfter: 170_000,
            customerDifference: -20_000, cashDelta: 0, ksefAction: 'CORRECT_DIFFERENCE',
        });
        renderModal();
        fireEvent.change(await screen.findByLabelText('Brutto: Przygotowanie do sprzedaży'), { target: { value: '1700,00' } });
        const aside = screen.getByLabelText('Podsumowanie poprawki');
        // Zmiana ceny przy tym samym nabywcy: korekta o różnicę, bez nowej faktury.
        await waitFor(() => expect(aside).toHaveTextContent('Korekta o różnicę'));
        expect(aside).toHaveTextContent('Faktura zostaje, nowa nie powstaje.');
        expect(aside).toHaveTextContent('Korekty w KSeF nie da się cofnąć.');
    });
});
