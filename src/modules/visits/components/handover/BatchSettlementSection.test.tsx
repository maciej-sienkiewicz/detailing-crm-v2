// @vitest-environment jsdom
//
// Wybór kontrahenta przy wydaniu na zlecenie zbiorcze: wyszukiwarka zamiast pigułek -
// studio z kilkudziesięcioma flotami nie przewija ściany przycisków.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { BatchSettlementSection } from './BatchSettlementSection';
import type { HandoverState } from '../../types/handover';
import type { Visit } from '../../types';

const contractors = [
    { id: 'a', name: 'FlotaRent Wynajem Długoterminowy Sp. z o.o.', taxId: '527-123-45-67', address: null, isActive: true },
    { id: 'b', name: 'Auto Salon Premium', taxId: '1234563218', address: null, isActive: true },
    { id: 'c', name: 'Car Rental Express', taxId: null, address: 'ul. Polna 1, Kraków', isActive: true },
    { id: 'x', name: 'Stara Flota', taxId: null, address: null, isActive: false },
];

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn() }) }));

vi.mock('@/modules/batch-orders/hooks/useBatchOrders', () => ({
    useContractors: () => ({ data: contractors, isLoading: false }),
    useCreateContractor: () => ({ mutateAsync: vi.fn() }),
}));

afterEach(cleanup);

const state = (batchContractorId: string | null): HandoverState => ({
    settlementMode: 'BATCH',
    batchContractorId,
    paymentMethod: 'CARD',
    documentType: 'INVOICE',
    buyer: { nip: '', name: '', addressLine1: '', addressLine2: '', email: '' },
    prices: [],
    lines: [],
    splitRemainder: false,
    remainderInput: '',
    exemptionBasis: '',
    protocolSigned: false,
    sendToKsef: null,
    thankYouSms: null,
});

const renderSection = (batchContractorId: string | null, patch = vi.fn()) => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <BatchSettlementSection
                    visit={{ customer: { firstName: 'Jan', lastName: 'Nowak' } } as unknown as Visit}
                    state={state(batchContractorId)}
                    patch={patch}
                    problemsIn={() => []}
                    priceControls={{ changePrice: vi.fn(), resetPrices: vi.fn(), discount: 0, totalGross: 0 }}
                    fmt={g => `${g} gr`}
                />
            </ThemeProvider>
        </QueryClientProvider>
    );
    return patch;
};

const options = () => within(screen.getByRole('listbox', { name: 'Kontrahenci' })).queryAllByRole('option');

describe('BatchSettlementSection - wybór kontrahenta', () => {
    it('bez wyboru pokazuje wyszukiwarkę i aktywnych kontrahentów, bez archiwum', () => {
        renderSection(null);
        expect(screen.getByRole('textbox', { name: 'Szukaj kontrahenta' })).toBeInTheDocument();
        expect(options()).toHaveLength(3);
        expect(screen.queryByText('Stara Flota')).not.toBeInTheDocument();
    });

    it('szuka po nazwie i po NIP-ie bez względu na kreski', () => {
        renderSection(null);
        const search = screen.getByRole('textbox', { name: 'Szukaj kontrahenta' });
        fireEvent.change(search, { target: { value: 'rental' } });
        expect(options().map(o => o.textContent)).toEqual([expect.stringContaining('Car Rental Express')]);
        fireEvent.change(search, { target: { value: '5271234567' } });
        expect(options().map(o => o.textContent)).toEqual([expect.stringContaining('FlotaRent')]);
    });

    it('brak wyników mówi, co zrobić, i zostawia dodanie z danych klienta', () => {
        renderSection(null);
        fireEvent.change(screen.getByRole('textbox', { name: 'Szukaj kontrahenta' }), { target: { value: 'nie ma' } });
        expect(screen.getByText('Brak takiego kontrahenta')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Dodaj kontrahenta z danych klienta/ })).toBeInTheDocument();
    });

    it('kliknięcie wybiera kontrahenta', () => {
        const patch = renderSection(null);
        fireEvent.click(screen.getByRole('option', { name: /Auto Salon Premium/ }));
        expect(patch).toHaveBeenCalledWith({ batchContractorId: 'b' });
    });

    it('wybrany kontrahent to jeden wiersz, „Zmień” wraca do wyszukiwania', () => {
        renderSection('a');
        expect(screen.queryByRole('textbox', { name: 'Szukaj kontrahenta' })).not.toBeInTheDocument();
        expect(screen.getByText('FlotaRent Wynajem Długoterminowy Sp. z o.o.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Zmień' }));
        expect(screen.getByRole('textbox', { name: 'Szukaj kontrahenta' })).toBeInTheDocument();
    });
});
