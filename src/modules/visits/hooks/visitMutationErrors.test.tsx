// @vitest-environment jsdom
//
// Interceptor apiClient pokazuje dymek tylko dla 4xx. 5xx i zerwane połączenie zostawały
// bez słowa: „Zatwierdź" zamykało okno, usługa zostawała PENDING, a „Gotowe do odbioru"
// odmawiało z powodu, którego sprzedawca nie widział. Mutacje wizyty mówią teraz same -
// ale tylko o tym, o czym interceptor nie powiedział (bez podwójnych dymków).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApproveServiceChange, useRejectServiceChange, useSaveServicesChanges, visitDetailQueryKey } from './index';
import { visitApi } from '../api/visitApi';

const showError = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError, showInfo: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() }),
}));

vi.mock('../api/visitApi', () => ({
    visitApi: {
        approveServiceChange: vi.fn(),
        rejectServiceChange: vi.fn(),
        saveServicesChanges: vi.fn(),
    },
}));

const VISIT_ID = 'visit-1';
const serverError = { response: { status: 500, data: { message: 'Wystąpił nieoczekiwany błąd.' } } };
const networkError = { message: 'Network Error' };
const badRequest = { response: { status: 400, data: { message: 'Only pending items can be approved' } } };

const wrapperWith = (queryClient: QueryClient) =>
    ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

const newClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

describe('mutacje wizyty: błąd, o którym nikt nie powiedział, ma dymek', () => {
    beforeEach(() => vi.clearAllMocks());

    it('5xx przy zatwierdzaniu zmiany: tytuł mówi, co się nie udało, i wizyta się odświeża', async () => {
        vi.mocked(visitApi.approveServiceChange).mockRejectedValue(serverError);
        const queryClient = newClient();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
        const { result } = renderHook(() => useApproveServiceChange(VISIT_ID), { wrapper: wrapperWith(queryClient) });

        result.current.approveServiceChange('line-1');

        await waitFor(() => expect(showError).toHaveBeenCalledOnce());
        expect(showError).toHaveBeenCalledWith('Nie udało się zatwierdzić zmiany', 'Wystąpił nieoczekiwany błąd.');
        expect(invalidate).toHaveBeenCalledWith({ queryKey: visitDetailQueryKey(VISIT_ID) });
    });

    it('zerwane połączenie przy wycofaniu: komunikat zapasowy, bo serwer nic nie przysłał', async () => {
        vi.mocked(visitApi.rejectServiceChange).mockRejectedValue(networkError);
        const { result } = renderHook(() => useRejectServiceChange(VISIT_ID), { wrapper: wrapperWith(newClient()) });

        result.current.rejectServiceChange('line-1');

        await waitFor(() => expect(showError).toHaveBeenCalledOnce());
        expect(showError).toHaveBeenCalledWith('Nie udało się wycofać zmiany', 'Usługa nadal czeka na decyzję. Spróbuj ponownie.');
    });

    it('4xx pokazał już interceptor: drugiego dymka nie ma', async () => {
        vi.mocked(visitApi.approveServiceChange).mockRejectedValue(badRequest);
        const { result } = renderHook(() => useApproveServiceChange(VISIT_ID), { wrapper: wrapperWith(newClient()) });
        const onError = vi.fn();

        result.current.approveServiceChange('line-1', { onError });

        await waitFor(() => expect(onError).toHaveBeenCalled());
        expect(showError).not.toHaveBeenCalled();
    });

    it('5xx przy zapisie zmian w usługach mówi, że wiersze czekają na ponowny zapis', async () => {
        vi.mocked(visitApi.saveServicesChanges).mockRejectedValue(serverError);
        const { result } = renderHook(() => useSaveServicesChanges(VISIT_ID), { wrapper: wrapperWith(newClient()) });
        const onSuccess = vi.fn();

        result.current.saveServicesChanges(
            { notifyCustomer: false, requireConfirmation: false, added: [], updated: [], deleted: [] },
            { onSuccess },
        );

        await waitFor(() => expect(showError).toHaveBeenCalledOnce());
        expect(showError.mock.calls[0][0]).toBe('Nie udało się zapisać zmian w usługach');
        // ServicesTable czyści wiersze robocze tylko w onSuccess - po błędzie zostają.
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
