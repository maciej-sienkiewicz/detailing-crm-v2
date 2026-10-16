// src/modules/checkin/components/SigningRequirementModal.test.tsx
// @vitest-environment jsdom
//
// Okno dokumentów przyjęcia: „Przerwać przyjęcie pojazdu?" → „Anuluj wizytę".
//
// Zgłoszenie z 29.09: tą drogą pracownik anulował szkic wizyty z przyjęcia bez
// rezerwacji i przyjął auto od nowa z rezerwacji, którą przyjęcie założyło samo.
// Anulowanie usuwa szkic razem z protokołami (a od poprawki backendu - także ich
// żądania podpisu na tablecie). Test pilnuje, że wyjście z okna nie usuwa wizyty
// bez decyzji i że „Anuluj wizytę" usuwa właśnie tę wizytę.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({
    cancelDraftVisit: vi.fn(async () => ({ reservationKept: true })),
    confirmDraftVisit: vi.fn(async () => ({})),
}));
const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));

vi.mock('@/modules/visits/api/visitApi', () => ({ visitApi: api }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => toast }));
vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: true, isLoading: false, missingFeatures: [], upsell: [] }),
}));
vi.mock('@/modules/visit-card/hooks/useVisitCardSettings', () => ({
    useVisitCardSettings: () => ({ sendByDefault: false }),
}));
vi.mock('@/modules/email-campaigns/api/emailCampaignsApi', () => ({
    fetchEmailAutomationConfig: async () => ({ visitWelcome: { enabled: false } }),
}));
vi.mock('../api/tabletApi', () => ({ tabletApi: { listTablets: async () => [] } }));
vi.mock('../hooks/useSignatureRequestsSocket', () => ({ useSignatureRequestsSocket: () => undefined }));
vi.mock('./DocumentPreview', () => ({ DocumentPreview: () => null }));
vi.mock('./NotificationSection', () => ({
    NotificationSection: () => null,
    defaultNotificationOptions: () => ({}),
    toConfirmVisitOptions: () => ({}),
}));

import { SigningRequirementModal } from './SigningRequirementModal';

type Extra = Partial<Pick<Parameters<typeof SigningRequirementModal>[0],
    'onBackToForm' | 'fromReservation' | 'isCreating' | 'visitId' | 'protocols' | 'protocolsError'>>;

const renderModal = (extra: Extra = {}) => {
    const onCancel = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <SigningRequirementModal
                    isOpen
                    isCreating={false}
                    onCancel={onCancel}
                    onConfirm={vi.fn()}
                    visitId="0e4691e3-24f7-42b1-a5af-23f6f85592d8"
                    visitNumber="1054/26"
                    customerName="Czekaj"
                    protocols={[]}
                    {...extra}
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onCancel };
};

describe('SigningRequirementModal - przerwanie przyjęcia', () => {
    beforeEach(() => {
        api.cancelDraftVisit.mockClear();
        toast.showSuccess.mockClear();
    });
    afterEach(cleanup);

    it('zamknięcie okna pyta o decyzję i niczego jeszcze nie usuwa', () => {
        const { onCancel } = renderModal();

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);

        expect(screen.getByText('Przerwać przyjęcie pojazdu?')).toBeInTheDocument();
        expect(api.cancelDraftVisit).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('„Anuluj wizytę" usuwa ten szkic i mówi, że rezerwacja została w kalendarzu', async () => {
        const { onCancel } = renderModal();

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);
        fireEvent.click(screen.getByRole('button', { name: /Anuluj wizytę/ }));

        await waitFor(() => expect(api.cancelDraftVisit).toHaveBeenCalledWith('0e4691e3-24f7-42b1-a5af-23f6f85592d8'));
        await waitFor(() => expect(onCancel).toHaveBeenCalled());
        expect(toast.showSuccess).toHaveBeenCalledWith(
            'Wizyta została anulowana',
            expect.stringContaining('Rezerwacja pozostała w kalendarzu'),
        );
    });

    it('„Wróć do dokumentów" zostawia wizytę', () => {
        const { onCancel } = renderModal();

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);
        fireEvent.click(screen.getByRole('button', { name: /Wróć do dokumentów/ }));

        expect(api.cancelDraftVisit).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.queryByText('Przerwać przyjęcie pojazdu?')).toBeNull();
    });

    // Zgłoszenie biznesu z 03.10: „Wizyta" w kalendarzu → „Utwórz wizytę" → „Przerwij
    // przyjęcie" → „Anuluj wizytę", a rezerwacja zostawała w kalendarzu. Backend usuwa
    // już rezerwację-cień walk-inu; okno nie może obiecywać, że rezerwacja „została".
    it('anulowany walk-in nie mówi o rezerwacji, której nie ma', async () => {
        api.cancelDraftVisit.mockResolvedValueOnce({ reservationKept: false });
        renderModal({ onBackToForm: vi.fn(), fromReservation: false });

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);
        expect(screen.getByText(/W kalendarzu nic po nim nie zostaje/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Anuluj wizytę/ }));

        await waitFor(() => expect(toast.showSuccess).toHaveBeenCalledWith(
            'Wizyta została anulowana',
            'Przyjęcie usunięte, w kalendarzu nic po nim nie zostało.',
        ));
    });

    // Zgłoszenie biznesu z 03.10: klient przy podpisie mówi „dorzućmy renowację
    // kierownicy" - z okna dokumentów trzeba wrócić do formularza, a nie do dokumentów.
    it('w kreatorze „Wróć do formularza" wraca do formularza i niczego nie usuwa', () => {
        const onBackToForm = vi.fn();
        const { onCancel } = renderModal({ onBackToForm, fromReservation: true });

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);
        expect(screen.queryByRole('button', { name: /Wróć do dokumentów/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Wróć do formularza/ }));

        expect(onBackToForm).toHaveBeenCalledTimes(1);
        expect(api.cancelDraftVisit).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('krzyżyk w pytaniu wraca do dokumentów, gdy „Przerwij" kliknięto przez pomyłkę', () => {
        const onBackToForm = vi.fn();
        renderModal({ onBackToForm });

        fireEvent.click(screen.getAllByRole('button', { name: 'Zamknij' })[0]);
        const closeButtons = screen.getAllByRole('button', { name: 'Zamknij' });
        fireEvent.click(closeButtons[closeButtons.length - 1]);

        expect(screen.queryByText('Przerwać przyjęcie pojazdu?')).toBeNull();
        expect(onBackToForm).not.toHaveBeenCalled();
        expect(api.cancelDraftVisit).not.toHaveBeenCalled();
    });
});

/*
 * Zgłoszenie: w trakcie zakładania wizyty okno miało już wyjścia, choć nie było czego
 * anulować - „Wróć do formularza" nic nie robiło, a „Anuluj wizytę" kończyło się
 * angielskim „No visit to cancel" w dymku.
 */
describe('SigningRequirementModal - zanim wizyta powstanie', () => {
    afterEach(cleanup);

    it('nie pokazuje wyjść, tylko mówi, że wizyta się zakłada', () => {
        renderModal({ isCreating: true, visitId: null });

        expect(screen.getByText('Trwa zakładanie wizyty…')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Zamknij' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Przerwij przyjęcie' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Zatwierdź i rozpocznij wizytę' })).toBeDisabled();
    });

    it('wyjścia wracają razem z numerem wizyty', () => {
        renderModal({ isCreating: false });

        expect(screen.queryByText('Trwa zakładanie wizyty…')).toBeNull();
        expect(screen.getByRole('button', { name: 'Przerwij przyjęcie' })).toBeEnabled();
    });
});

/*
 * Zgłoszenie: nieudany odczyt dokumentów wyglądał jak „Ta wizyta nie wymaga protokołów."
 * i pozwalał zatwierdzić wizytę bez żadnego podpisu.
 */
describe('SigningRequirementModal - dokumentów nie dało się wczytać', () => {
    afterEach(cleanup);

    it('pokazuje błąd z ponowieniem zamiast „nie wymaga protokołów" i nie pozwala zatwierdzić', () => {
        const onRetry = vi.fn();
        renderModal({
            protocols: [],
            protocolsError: { title: 'Nie udało się wczytać dokumentów', message: 'Brak połączenia z serwerem.', onRetry },
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać dokumentów');
        expect(screen.queryByText('Ta wizyta nie wymaga protokołów.')).toBeNull();
        expect(screen.getByRole('button', { name: 'Zatwierdź i rozpocznij wizytę' })).toBeDisabled();
        // Wyjście zostaje - sprzedawca nie utknie w oknie.
        expect(screen.getByRole('button', { name: 'Przerwij przyjęcie' })).toBeEnabled();

        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });
});
