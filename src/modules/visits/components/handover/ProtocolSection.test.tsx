// @vitest-environment jsdom
//
// Protokół wydania przy błędach serwera. Dwa zgłoszenia:
//  - nieudany odczyt listy dawał `protocols = []`, ekran brał to za „brak protokołu"
//    i generował nowy obok istniejących (kolejne protokoły CHECK_OUT tej samej wizyty),
//  - 500 przy generowaniu kończyło się zdaniem „Brak dokumentu… Dodaj go w Ustawieniach",
//    a jednorazowy strzał (ref) nie pozwalał spróbować drugi raz.
// Wydanie ma przy tym zostać możliwe: krok podpisu raportuje „0 dokumentów", więc
// stopka mówi „Przejdź do płatności" (signatureStep.advanceLabel).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { protocolsApi } from '@/modules/protocols/api/protocolsApi';
import type { VisitProtocol } from '@/modules/protocols/types';
import { ProtocolSection } from './ProtocolSection';

const showError = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError, showInfo: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: true, isLoading: false, lockReason: null }),
}));
vi.mock('@/modules/protocols/api/protocolsApi', () => ({
    protocolsApi: {
        getVisitProtocols: vi.fn(),
        generateVisitProtocols: vi.fn(),
        setVisualCondition: vi.fn(),
    },
}));
vi.mock('@/modules/checkin/hooks/useProtocolSigning', () => ({
    useProtocolSigning: () => ({ byProtocol: {}, tablets: [], sendToTablet: vi.fn(), sendToPhone: vi.fn() }),
}));
vi.mock('@/modules/checkin/components/DocumentPreview', () => ({ DocumentPreview: () => null }));

const getVisitProtocols = vi.mocked(protocolsApi.getVisitProtocols);
const generateVisitProtocols = vi.mocked(protocolsApi.generateVisitProtocols);

const CHECK_OUT = {
    id: 'p-1',
    stage: 'CHECK_OUT',
    isSigned: false,
    filledPdfUrl: null,
    protocolTemplate: { name: 'Protokół wydania pojazdu' },
} as unknown as VisitProtocol;

const serverError = { response: { status: 500, data: {} } };

const renderSection = () => {
    const onStatusChange = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <ProtocolSection
                    visitId="visit-1"
                    signerName="Jan Kowalski"
                    customerPhone="500100200"
                    isOpen
                    onStatusChange={onStatusChange}
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onStatusChange };
};

describe('ProtocolSection: awaria serwera to nie „brak dokumentu"', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('nieudany odczyt listy nie generuje protokołu i mówi o błędzie, nie o Ustawieniach', async () => {
        getVisitProtocols.mockRejectedValue(serverError);
        const { onStatusChange } = renderSection();

        expect(await screen.findByText('Nie udało się pobrać protokołu wydania')).toBeInTheDocument();
        expect(generateVisitProtocols).not.toHaveBeenCalled();
        expect(screen.queryByText(/Dodaj go w Ustawieniach/)).toBeNull();
        // Krok podpisu nie blokuje wydania: zero dokumentów do podpisu.
        expect(onStatusChange).toHaveBeenLastCalledWith({ total: 0, signed: 0 });
    });

    it('„Spróbuj ponownie" po błędzie odczytu: protokół istniał, więc niczego nie generuje', async () => {
        getVisitProtocols.mockRejectedValueOnce(serverError).mockResolvedValue([CHECK_OUT]);
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));

        expect(await screen.findByText('Protokół wydania pojazdu')).toBeInTheDocument();
        expect(generateVisitProtocols).not.toHaveBeenCalled();
    });

    it('udany odczyt bez protokołu wydania generuje go raz', async () => {
        getVisitProtocols.mockResolvedValueOnce([]).mockResolvedValue([CHECK_OUT]);
        generateVisitProtocols.mockResolvedValue([CHECK_OUT]);
        renderSection();

        expect(await screen.findByText('Protokół wydania pojazdu')).toBeInTheDocument();
        expect(generateVisitProtocols).toHaveBeenCalledOnce();
    });

    it('500 przy generowaniu: komunikat o błędzie i ponowienie, które najpierw czyta listę', async () => {
        getVisitProtocols.mockResolvedValue([]);
        generateVisitProtocols.mockRejectedValueOnce(serverError).mockResolvedValue([CHECK_OUT]);
        renderSection();

        expect(await screen.findByText('Nie udało się przygotować protokołu wydania')).toBeInTheDocument();
        expect(screen.queryByText(/Dodaj go w Ustawieniach/)).toBeNull();
        expect(getVisitProtocols).toHaveBeenCalledTimes(1);

        getVisitProtocols.mockResolvedValue([CHECK_OUT]);
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

        expect(await screen.findByText('Protokół wydania pojazdu')).toBeInTheDocument();
        expect(getVisitProtocols).toHaveBeenCalledTimes(2);
        // Protokół zdążył powstać mimo 500 - drugiego nie generujemy.
        expect(generateVisitProtocols).toHaveBeenCalledOnce();
    });

    it('ponowienie, gdy protokołu nadal nie ma, odblokowuje jednorazowe generowanie', async () => {
        getVisitProtocols.mockResolvedValue([]);
        generateVisitProtocols.mockRejectedValueOnce(serverError).mockResolvedValue([CHECK_OUT]);
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));

        await waitFor(() => expect(generateVisitProtocols).toHaveBeenCalledTimes(2));
    });

    it('studio bez dokumentu na wydanie nadal widzi podpowiedź z Ustawieniami', async () => {
        getVisitProtocols.mockResolvedValue([]);
        generateVisitProtocols.mockResolvedValue([]);
        renderSection();

        expect(await screen.findByText(/Dodaj go w Ustawieniach/)).toBeInTheDocument();
        expect(generateVisitProtocols).toHaveBeenCalledOnce();
    });
});
