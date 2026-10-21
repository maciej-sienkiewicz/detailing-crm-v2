// Karta klienta pyta o całą historię jednym, stałym adresem. Dawniej okno „5 lat wstecz"
// liczone od teraz: starsze wizyty znikały, a URL był inny przy każdym wywołaniu.
import { afterEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/apiClient', () => ({ apiClient: http }));

import { customerDetailApi } from './customerDetailApi';

afterEach(() => vi.clearAllMocks());

describe('historia klienta', () => {
    it('bez zakresu dat - ten sam adres przy każdym wejściu', async () => {
        http.get.mockResolvedValue({ data: { appointments: [], visits: [] } });

        await customerDetailApi.getCustomerActiveData('c-1');
        await customerDetailApi.getCustomerActiveData('c-1');

        const [first, second] = http.get.mock.calls.map(([url, config]) => ({ url, params: config.params }));
        expect(first).toEqual(second);
        expect(first.url).toBe('/v1/calendar/events');
        expect(first.params).not.toHaveProperty('startDate');
        expect(first.params).not.toHaveProperty('endDate');
        expect(first.params.customerId).toBe('c-1');
    });
});
