// Zakładki „Wszystkie" i „Odrzucone" to jedno zapytanie - serwer scala wizyty i rezerwacje,
// sortuje po dacie i stronicuje. Dawniej cztery zapytania na stronę sklejane w przeglądarce.
import { afterEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { operationApi } from './operationApi';

const page = { currentPage: 2, totalPages: 5, totalItems: 98, itemsPerPage: 20 };

afterEach(() => vi.clearAllMocks());

const paramsOf = (call: number) => new URL(`http://x${http.get.mock.calls[call][0]}`).searchParams;

describe('operationApi.getOperations - wizyty i rezerwacje razem', () => {
    it('„Wszystkie": jedno zapytanie, paginacja z serwera', async () => {
        http.get.mockResolvedValue({ data: { items: [], pagination: page } });

        const result = await operationApi.getOperations({ search: ' Kowalski ', page: 2, limit: 20 });

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get.mock.calls[0][0]).toMatch(/^\/v1\/operations\?/);
        expect(paramsOf(0).get('appointmentStatuses')).toBe('CREATED,ABANDONED,CANCELLED');
        expect(paramsOf(0).get('visitStatus')).toBeNull();
        expect(paramsOf(0).get('search')).toBe('Kowalski');
        expect(result.pagination).toEqual(page);
    });

    it('„Odrzucone": status wizyt filtruje serwer, rezerwacje porzucone i anulowane', async () => {
        http.get.mockResolvedValue({ data: { items: [], pagination: page } });

        await operationApi.getOperations({ search: '', page: 1, limit: 20, status: 'REJECTED' });

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(paramsOf(0).get('visitStatus')).toBe('REJECTED');
        expect(paramsOf(0).get('appointmentStatuses')).toBe('ABANDONED,CANCELLED');
    });
});
