// @vitest-environment jsdom
//
// Regresja z produkcji: usunięcie leada kończyło się dymkiem „Nie udało się usunąć
// leada / Spróbuj ponownie", wiersz zostawał w tabeli — a serwer odpowiadał 204 i lead
// był skasowany. Po odświeżeniu strony wiersz znikał, czyli żądanie od początku szło
// dobrze i psuło się dopiero po stronie przeglądarki.
//
// Powód: pod prefiksem ['leads', 'list'] nie stoją wyłącznie strony listy. Mieszka tam
// też licznik plakietki (useNewLeadsCount) — świadomie, żeby jedno unieważnienie listy
// odświeżało i jego. `setQueriesData` po tym prefiksie podaje więc updaterowi także
// zwykłą LICZBĘ, a `liczba.items.some(...)` to TypeError.
//
// Rzut wychodził z `onSuccess`, a React Query traktuje wyjątek z tego callbacku jak
// błąd całej mutacji: odpalał `onError` (dymek), a reszta `onSuccess` — z usunięciem
// wiersza z cache włącznie — nie wykonywała się nigdy.
//
// Pułapka jest niewidoczna dla oka, bo zależy od WARTOŚCI licznika: przy zerze
// `if (!page) return page` wychodziło wcześniej i wszystko działało. Awaria zaczynała
// się dopiero wtedy, gdy studio miało choć jednego leada do obsłużenia.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteLead, LEADS_KEY } from './useLeads';
import { leadsApi } from '../api/leadsApi';
import type { LeadPage } from '../types';

const LEAD_ID = 'e2b2320a-ecf8-4d43-a76f-dfe96772ce31';

const showSuccess = vi.fn();
const showError = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showError }),
}));

vi.mock('../api/leadsApi', () => ({
    leadsApi: { deleteLead: vi.fn() },
}));

const deleteLeadApi = vi.mocked(leadsApi.deleteLead);

const listKey = [...LEADS_KEY, 'list', { status: undefined, page: 0 }];
/** Klucz plakietki — ten sam prefiks `list`, ale dane to liczba, nie strona. */
const attentionCountKey = [...LEADS_KEY, 'list', 'attention-count'];

const page = (): LeadPage => ({
    items: [
        { id: LEAD_ID, contactIdentifier: 'klient@example.com' },
        { id: 'inny-lead', contactIdentifier: 'ktos@example.com' },
    ],
    total: 2,
    page: 0,
    pageSize: 20,
} as unknown as LeadPage);

const setup = (attentionCount: number) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(listKey, page());
    queryClient.setQueryData(attentionCountKey, attentionCount);

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { queryClient, ...renderHook(() => useDeleteLead(), { wrapper }) };
};

describe('useDeleteLead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        deleteLeadApi.mockResolvedValue(undefined);
    });

    it('usuwa wiersz i potwierdza sukces, gdy plakietka pokazuje niezerowy licznik', async () => {
        // Dokładny stan z produkcji: studio ma leady do obsłużenia, więc licznik
        // jest prawdziwą liczbą — i to on wykładał updater listy.
        const { queryClient, result } = setup(3);

        result.current.mutate({ leadId: LEAD_ID, deleteAppointment: false });

        await waitFor(() => expect(showSuccess).toHaveBeenCalled());
        expect(showError).not.toHaveBeenCalled();

        const updated = queryClient.getQueryData<LeadPage>(listKey)!;
        expect(updated.items.map((item) => item.id)).toEqual(['inny-lead']);
        expect(updated.total).toBe(1);
    });

    it('nie rusza licznika plakietki, mimo że stoi pod tym samym prefiksem', async () => {
        const { queryClient, result } = setup(3);

        result.current.mutate({ leadId: LEAD_ID });

        await waitFor(() => expect(showSuccess).toHaveBeenCalled());
        expect(queryClient.getQueryData(attentionCountKey)).toBe(3);
    });

    it('działa tak samo przy zerowym liczniku', async () => {
        // Wariant, w którym błąd się NIE ujawniał — pilnujemy, żeby obie ścieżki
        // zachowywały się identycznie i test nie przechodził przypadkiem.
        const { queryClient, result } = setup(0);

        result.current.mutate({ leadId: LEAD_ID });

        await waitFor(() => expect(showSuccess).toHaveBeenCalled());
        expect(queryClient.getQueryData<LeadPage>(listKey)!.items).toHaveLength(1);
    });

    it('prawdziwa odmowa serwera nadal daje komunikat błędu', async () => {
        // Strażnik kształtu nie może uciszyć błędów, które faktycznie się zdarzają
        // (np. „lead ma rezerwację") — inaczej naprawa jednego problemu tworzy drugi.
        deleteLeadApi.mockRejectedValue({
            response: { data: { message: 'Lead ma powiązaną rezerwację' } },
        });
        const { queryClient, result } = setup(3);

        result.current.mutate({ leadId: LEAD_ID });

        await waitFor(() => expect(showError).toHaveBeenCalled());
        expect(showError).toHaveBeenCalledWith(
            'Nie udało się usunąć leada',
            'Lead ma powiązaną rezerwację'
        );
        expect(showSuccess).not.toHaveBeenCalled();
        // Wiersz zostaje: serwer go nie usunął.
        expect(queryClient.getQueryData<LeadPage>(listKey)!.items).toHaveLength(2);
    });
});
