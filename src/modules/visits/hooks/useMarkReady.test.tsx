// @vitest-environment jsdom
//
// Zgłoszenie z warsztatu (screenshot z 8.09, 15:28): kliknięcie „Oznacz jako gotowe"
// kończyło się DWOMA czerwonymi dymkami naraz — jednym z surowym
// „Cannot transition from READY_FOR_PICKUP to READY_FOR_PICKUP. Allowed transitions:
// [COMPLETED, IN_PROGRESS]" i drugim „Nie udało się zmienić statusu wizyty".
//
// Wizyta była już gotowa do odbioru: ktoś inny (kolega, tablet, druga karta) zdążył
// pierwszy, a ta przeglądarka nie odświeżała statusu. Czyli nic złego się nie stało,
// a użytkownik dostawał komunikat, że zawalił — po angielsku i z nazwami enumów.
//
// Te testy pilnują trzech rzeczy: konflikt nie jest błędem, odświeża widok, i mówi
// jednym głosem zamiast dwoma.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkReady } from './useMarkReady';
import { stateTransitionApi } from '../api/stateTransitionApi';

const VISIT_ID = 'fca14099-adca-4ea8-9cdd-1ad478099dc1';

const showError = vi.fn();
const showInfo = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError, showInfo }),
}));

vi.mock('../api/stateTransitionApi', () => ({
    stateTransitionApi: { markReadyForPickup: vi.fn() },
}));

const markReadyApi = vi.mocked(stateTransitionApi.markReadyForPickup);

const conflict = (code: string, message: string) => ({
    response: { status: 409, data: { code, message } },
});

const setup = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const onSuccess = vi.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMarkReady(VISIT_ID, onSuccess), { wrapper });
    return { result, invalidateQueries, onSuccess };
};

describe('useMarkReady — konflikt stanu wizyty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('409 „już gotowa" nie jest pokazywany jako błąd', async () => {
        markReadyApi.mockRejectedValue(conflict('VISIT_ALREADY_IN_STATE', 'Wizyta ma już status „Gotowa do odbioru”.'));
        const { result } = setup();

        result.current.markReady({ sms: true, email: false });

        await waitFor(() => expect(showInfo).toHaveBeenCalled());
        expect(showError).not.toHaveBeenCalled();
        expect(showInfo.mock.calls[0][0]).toBe('To już zostało zrobione');
    });

    it('409 odświeża widok, żeby następne kliknięcie było poprawne', async () => {
        markReadyApi.mockRejectedValue(conflict('VISIT_ALREADY_IN_STATE', 'Wizyta ma już status „Gotowa do odbioru”.'));
        const { result, invalidateQueries } = setup();

        result.current.markReady({ sms: true, email: false });

        await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());
        const keys = invalidateQueries.mock.calls.map(call => JSON.stringify(call[0]?.queryKey));
        expect(keys.some(key => key?.includes(VISIT_ID))).toBe(true);
    });

    it('409 zamyka modal — praca użytkownika jest skończona', async () => {
        markReadyApi.mockRejectedValue(conflict('VISIT_STATE_CONFLICT', 'Wizyta ma teraz status „Zakończona”.'));
        const { result, onSuccess } = setup();

        result.current.markReady({ sms: false, email: false });

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });

    it('konflikt z innym stanem tłumaczy, że wizyta zmieniła się w międzyczasie', async () => {
        markReadyApi.mockRejectedValue(conflict('VISIT_STATE_CONFLICT', 'Wizyta ma teraz status „Zakończona”.'));
        const { result } = setup();

        result.current.markReady({ sms: false, email: false });

        await waitFor(() => expect(showInfo).toHaveBeenCalled());
        expect(showInfo.mock.calls[0][0]).toBe('Wizyta zmieniła się w międzyczasie');
        expect(showInfo.mock.calls[0][1]).toContain('Odświeżyliśmy widok');
    });

    it('200 z alreadyInTargetState mówi wprost, że klient nie dostał drugiego SMS-a', async () => {
        markReadyApi.mockResolvedValue({
            visitId: VISIT_ID, newStatus: 'ready_for_pickup', message: 'ok', alreadyInTargetState: true,
        });
        const { result, onSuccess } = setup();

        result.current.markReady({ sms: true, email: false });

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(showInfo).toHaveBeenCalled();
        expect(showInfo.mock.calls[0][1]).toContain('drugiego powiadomienia');
        expect(showError).not.toHaveBeenCalled();
    });

    it('zwykła zmiana statusu nie zawraca użytkownikowi głowy dymkiem', async () => {
        markReadyApi.mockResolvedValue({
            visitId: VISIT_ID, newStatus: 'ready_for_pickup', message: 'ok', alreadyInTargetState: false,
        });
        const { result, onSuccess } = setup();

        result.current.markReady({ sms: true, email: false });

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(showInfo).not.toHaveBeenCalled();
        expect(showError).not.toHaveBeenCalled();
    });

    it('awaria niebędąca konfliktem nadal jest błędem', async () => {
        markReadyApi.mockRejectedValue({ response: { status: 500, data: {} } });
        const { result } = setup();

        result.current.markReady({ sms: false, email: false });

        await waitFor(() => expect(showError).toHaveBeenCalled());
        expect(showError.mock.calls[0][0]).toBe('Błąd');
        expect(showInfo).not.toHaveBeenCalled();
    });
});
