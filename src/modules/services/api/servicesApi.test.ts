// Regresja z produkcji: „Edytuj pozycję" na usłudze założonej w locie w szybkiej
// rezerwacji wysyłał do POST /services/update `originalServiceId: "temp-…"`. Backend
// odpowiadał anonimowym 400, a w logu zostawało samo „Invalid UUID string".
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/core', () => ({ apiClient: { post: (...args: unknown[]) => post(...args) } }));

import { servicesApi } from './servicesApi';

const request = (originalServiceId: string) => ({
    originalServiceId,
    name: 'powłoka na felgi',
    basePriceNet: 73_171,
    basePriceGross: 90_000,
    vatRate: 23 as const,
    requireManualPrice: false,
});

describe('servicesApi.updateService - tylko usługi z cennika', () => {
    beforeEach(() => post.mockReset());

    it('identyfikator zastępczy nie wychodzi do backendu', async () => {
        await expect(servicesApi.updateService(request('temp-1790326470364')))
            .rejects.toThrow('temp-1790326470364');
        expect(post).not.toHaveBeenCalled();
    });

    it('usługa z cennika idzie do /update z dokładną parą netto/brutto', async () => {
        post.mockResolvedValue({ data: { id: 'new-id' } });
        const id = '3f2b8c1e-9a4d-4e7b-b0de-1c2d3e4f5a6b';

        await servicesApi.updateService(request(id));

        expect(post).toHaveBeenCalledWith('/v1/services/update', expect.objectContaining({
            originalServiceId: id,
            basePriceNet: 73_171,
            basePriceGross: 90_000,
        }));
    });
});
