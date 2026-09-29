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
    cancelDraftVisit: vi.fn(async () => undefined),
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

const renderModal = () => {
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
});
