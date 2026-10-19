import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/core', () => ({ apiClient: { get } }));

import { fetchWholeCatalog } from './fetchWholeCatalog';

const page = (names: string[], totalPages: number) => ({
    data: { services: names.map(name => ({ name })), pagination: { totalPages } },
});

beforeEach(() => get.mockReset());

/**
 * Zgłoszenie z 19.10: w oknie szybkiej rezerwacji brakowało pakietów, bo okno brało
 * tylko pierwszą stronę cennika (50 pozycji w dowolnej kolejności).
 */
describe('fetchWholeCatalog', () => {
    it('pobiera cennik do ostatniej strony, posortowany po nazwie', async () => {
        get.mockResolvedValueOnce(page(['Mycie'], 2)).mockResolvedValueOnce(page(['PPF - Full body (pakiet)'], 2));

        const services = await fetchWholeCatalog<{ name: string }>();

        expect(services.map(s => s.name)).toEqual(['Mycie', 'PPF - Full body (pakiet)']);
        expect(get).toHaveBeenCalledTimes(2);
        expect(get).toHaveBeenLastCalledWith('/v1/services', {
            params: { page: 2, limit: 500, sortBy: 'name', sortDirection: 'asc' },
        });
    });

    it('jedna strona to jedno zapytanie', async () => {
        get.mockResolvedValueOnce(page(['Mycie'], 1));

        await fetchWholeCatalog();

        expect(get).toHaveBeenCalledTimes(1);
    });

    it('pusta strona kończy pobieranie, nawet gdy serwer podaje więcej stron', async () => {
        get.mockResolvedValueOnce(page([], 3));

        expect(await fetchWholeCatalog()).toEqual([]);
        expect(get).toHaveBeenCalledTimes(1);
    });
});
