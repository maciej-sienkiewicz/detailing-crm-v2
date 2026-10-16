// @vitest-environment jsdom
//
// Dokończenie przerwanego przyjęcia: dokumenty czytamy z serwera. Zgłoszenie: nieudany
// odczyt i pusta lista (zapis przerwany przed wygenerowaniem dokumentów, np. błąd serwera
// przy poprawce usług) wyglądały tak samo jak „Ta wizyta nie wymaga protokołów." - i okno
// pozwalało zatwierdzić wizytę bez podpisu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { VisitProtocol } from '@/modules/protocols/types';

const api = vi.hoisted(() => ({
    getVisitProtocols: vi.fn(),
    generateVisitProtocols: vi.fn(),
}));
vi.mock('@/modules/protocols/api/protocolsApi', () => ({ protocolsApi: api }));

// Okno dokumentów ma własne testy - tu liczy się tylko, co dostaje.
vi.mock('./SigningRequirementModal', () => ({
    SigningRequirementModal: (p: {
        isCreating: boolean;
        protocols: { id: string; filledPdfUrl?: string }[];
        signedProtocolIds?: string[];
        protocolsError?: { title: string; message: string; onRetry: () => void };
    }) => (
        <div>
            <span data-testid="stan">
                {p.isCreating ? 'wczytywanie' : p.protocolsError ? 'błąd' : `dokumenty: ${p.protocols.map(x => x.id).join(',') || 'brak'}`}
            </span>
            {p.protocolsError && (
                <>
                    <strong>{p.protocolsError.title}</strong>
                    <span>{p.protocolsError.message}</span>
                    <button type="button" onClick={p.protocolsError.onRetry}>Spróbuj ponownie</button>
                </>
            )}
            <span data-testid="podpisane">{(p.signedProtocolIds ?? []).join(',')}</span>
            <span data-testid="pliki">{p.protocols.map(x => x.filledPdfUrl ?? '-').join(',')}</span>
        </div>
    ),
}));

import { ResumeCheckInModal } from './ResumeCheckInModal';

const protocol = (id: string, extra: Partial<VisitProtocol> = {}): VisitProtocol => ({
    id, visitId: 'v-1', protocolTemplateId: 't-1', stage: 'CHECK_IN', isSigned: false,
    filledPdfUrl: `https://s3/${id}.pdf`, createdAt: '', updatedAt: '', ...extra,
} as VisitProtocol);

const draft = {
    visitId: 'v-1', visitNumber: '1054/26', customerName: 'Jan Kowalski',
    customerPhone: null, customerEmail: null, hasPhotos: false, hasDamageMap: false,
};

const renderModal = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ResumeCheckInModal draft={draft} onConfirmed={vi.fn()} onCancelled={vi.fn()} />
    </QueryClientProvider>,
);
const state = () => screen.getByTestId('stan');

beforeEach(() => {
    api.getVisitProtocols.mockResolvedValue([protocol('p-1')]);
    api.generateVisitProtocols.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ResumeCheckInModal - dokumenty szkicu', () => {
    it('gotowe dokumenty: pokazuje je, z plikiem do druku, i niczego nie generuje', async () => {
        api.getVisitProtocols.mockResolvedValue([protocol('p-1'), protocol('p-2', { isSigned: true })]);
        renderModal();

        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: p-1,p-2'));
        expect(screen.getByTestId('podpisane')).toHaveTextContent('p-2');
        expect(screen.getByTestId('pliki')).toHaveTextContent('https://s3/p-1.pdf');
        expect(api.generateVisitProtocols).not.toHaveBeenCalled();
    });

    it('nieudany odczyt: błąd z „Spróbuj ponownie", a nie „nie wymaga protokołów"', async () => {
        api.getVisitProtocols.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { isAxiosError: true }));
        renderModal();

        await waitFor(() => expect(state()).toHaveTextContent('błąd'));
        expect(screen.getByText('Nie udało się wczytać dokumentów')).toBeInTheDocument();
        expect(screen.getByText('Brak połączenia z serwerem. Przyjęcie jest zapisane, spróbuj ponownie.')).toBeInTheDocument();
        expect(api.generateVisitProtocols).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: p-1'));
        expect(api.getVisitProtocols).toHaveBeenCalledTimes(2);
    });

    it('pusta lista: generuje dokumenty przyjęcia raz i pokazuje wynik', async () => {
        api.getVisitProtocols.mockResolvedValue([]);
        api.generateVisitProtocols.mockResolvedValue([protocol('nowy')]);
        renderModal();

        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: nowy'));
        expect(api.generateVisitProtocols).toHaveBeenCalledTimes(1);
        expect(api.generateVisitProtocols).toHaveBeenCalledWith('v-1', 'CHECK_IN');
    });

    it('dokument bez pliku (PENDING): generuje raz, nawet gdy po wygenerowaniu plik dalej nie istnieje', async () => {
        api.getVisitProtocols.mockResolvedValue([protocol('p-1', { filledPdfUrl: undefined })]);
        api.generateVisitProtocols.mockResolvedValue([protocol('p-1', { filledPdfUrl: undefined })]);
        renderModal();

        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: p-1'));
        expect(api.generateVisitProtocols).toHaveBeenCalledTimes(1);
    });

    it('„nie wymaga protokołów" dopiero wtedy, gdy wygenerowanie nic nie dało', async () => {
        api.getVisitProtocols.mockResolvedValue([]);
        let finish: (value: VisitProtocol[]) => void = () => {};
        api.generateVisitProtocols.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        renderModal();

        await waitFor(() => expect(api.generateVisitProtocols).toHaveBeenCalled());
        expect(state()).toHaveTextContent('wczytywanie');

        finish([]);
        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: brak'));
    });

    it('nieudane wygenerowanie: błąd z ponowieniem', async () => {
        api.getVisitProtocols.mockResolvedValue([]);
        api.generateVisitProtocols
            .mockRejectedValueOnce(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 500, data: {} } }))
            .mockResolvedValueOnce([protocol('nowy')]);
        renderModal();

        await waitFor(() => expect(screen.getByText('Nie udało się przygotować dokumentów')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

        await waitFor(() => expect(state()).toHaveTextContent('dokumenty: nowy'));
        expect(api.generateVisitProtocols).toHaveBeenCalledTimes(2);
    });
});
