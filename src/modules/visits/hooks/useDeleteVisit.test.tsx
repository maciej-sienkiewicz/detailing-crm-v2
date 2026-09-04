// @vitest-environment jsdom
//
// Regresja z produkcji: po udanym usunięciu wizyty z jej własnego widoku użytkownik
// dostawał trzy dymki o BŁĘDZIE („Visit not found…") i ani jednego o powodzeniu.
//
// Powód: klucze zapytań wizyty są prefiksowane (`['visit', id, ...]`), a react-query
// dopasowuje je po prefiksie - `removeQueries` wywołane, gdy widok jeszcze stoi na
// ekranie, kasowało naraz szczegół, dokumenty, zdjęcia, komentarze, komunikację
// i przypomnienia SMS, a każdy żywy obserwator natychmiast pobierał swoje zapytanie
// od nowa, po rekord, którego już nie ma.
//
// Te testy pilnują KOLEJNOŚCI: zapytania mają być wygaszone, ZANIM cokolwiek
// zniknie z cache.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteVisit } from './useDeleteVisit';
import { visitApi } from '../api/visitApi';

const VISIT_ID = 'fca14099-adca-4ea8-9cdd-1ad478099dc1';

const navigate = vi.fn();
const showSuccess = vi.fn();
const showWarning = vi.fn();

// Częściowy mock: `./index` ciągnie za sobą kawał aplikacji, która używa <Link>.
vi.mock('react-router-dom', async importOriginal => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => navigate,
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showWarning }),
}));

vi.mock('../api/visitApi', () => ({
    visitApi: { deleteVisit: vi.fn() },
}));

const deleteVisitApi = vi.mocked(visitApi.deleteVisit);

/** Identyfikator widziany przez zapytania w bieżącym renderze. */
let activeIdInRender = '';
/** Identyfikator, jaki obowiązywał przy PIERWSZYM czyszczeniu cache. */
let activeIdWhenCacheCleared: string | null = null;

const setup = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const removeQueries = vi.spyOn(queryClient, 'removeQueries').mockImplementation(() => {
        // Liczy się pierwsze czyszczenie: to ono decyduje, czy żywy obserwator
        // zdąży pobrać zapytanie od nowa.
        if (activeIdWhenCacheCleared === null) activeIdWhenCacheCleared = activeIdInRender;
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const view = renderHook(() => {
        const hook = useDeleteVisit(VISIT_ID);
        activeIdInRender = hook.activeVisitId;
        return hook;
    }, { wrapper });

    return { ...view, removeQueries, invalidateQueries };
};

describe('useDeleteVisit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeIdInRender = '';
        activeIdWhenCacheCleared = null;
    });

    it('wygasza zapytania wizyty, zanim wyczyści cache', async () => {
        deleteVisitApi.mockResolvedValue(undefined);
        const { result, removeQueries } = setup();

        expect(result.current.activeVisitId).toBe(VISIT_ID);
        result.current.deleteVisit();

        await waitFor(() => expect(removeQueries).toHaveBeenCalled());
        // Gdyby cache znikał przy żywych obserwatorach, każdy z nich pobrałby swoje
        // zapytanie od nowa - i stąd brały się dymki o błędzie po udanym usunięciu.
        expect(activeIdWhenCacheCleared, 'zapytania muszą być wygaszone przed czyszczeniem cache').toBe('');
        expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['visit', VISIT_ID] });
    });

    it('mówi o powodzeniu i nie zostawia widoku na usuniętej wizycie', async () => {
        deleteVisitApi.mockResolvedValue(undefined);
        const { result } = setup();

        result.current.deleteVisit();

        await waitFor(() => expect(navigate).toHaveBeenCalled());
        expect(showSuccess).toHaveBeenCalledWith('Wizyta została usunięta');
        expect(showWarning).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith('/operations', { replace: true });
        expect(result.current.isDeleted).toBe(true);
        expect(result.current.activeVisitId).toBe('');
    });

    it('nieudane usunięcie zostawia widok na miejscu z zapytaniami w komplecie', async () => {
        deleteVisitApi.mockRejectedValue({ response: { status: 409, data: { message: 'Wizyta jest rozliczona' } } });
        const { result, removeQueries } = setup();

        result.current.deleteVisit();

        await waitFor(() => expect(showWarning).toHaveBeenCalledWith('Wizyta jest rozliczona'));
        expect(navigate).not.toHaveBeenCalled();
        expect(removeQueries).not.toHaveBeenCalled();
        expect(result.current.activeVisitId, 'widok dalej pokazuje wizytę, więc musi mieć skąd wziąć dane').toBe(VISIT_ID);
        expect(showSuccess).not.toHaveBeenCalled();
    });

    it('403 zostawia komunikat globalnemu interceptorowi', async () => {
        deleteVisitApi.mockRejectedValue({ response: { status: 403, data: { message: 'Brak uprawnień' } } });
        const { result } = setup();

        result.current.deleteVisit();

        await waitFor(() => expect(deleteVisitApi).toHaveBeenCalled());
        await waitFor(() => expect(result.current.isDeleting).toBe(false));
        expect(showWarning).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });
});
