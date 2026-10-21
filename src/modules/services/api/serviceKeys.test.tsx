// @vitest-environment jsdom
//
// Każdy odczyt cennika leży pod `serviceKeys.all`. Wyszukiwarka w wierszu wizyty miała
// własny prefiks (`svc-inline-search`), więc nowa usługa nie pojawiała się w niej do
// odświeżenia strony; okna z „Nową usługą" unieważniały cennik drugi raz po mutacji.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ getServices: vi.fn(), createService: vi.fn() }));
vi.mock('./servicesApi', () => ({ servicesApi: api }));

import { serviceKeys } from './serviceKeys';
import { useCreateService } from '../hooks/useServices';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('serviceKeys', () => {
    it('nowa usługa odświeża wyszukiwarkę w wierszu wizyty jednym zapytaniem', async () => {
        api.getServices.mockResolvedValue({ services: [], pagination: {} });
        api.createService.mockResolvedValue({ id: 's1' });
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => ({
            inline: useQuery({
                queryKey: serviceKeys.search('inline', 'pol'),
                queryFn: () => api.getServices({ search: 'pol', page: 1, limit: 8 }),
            }),
            create: useCreateService(),
        }), { wrapper });
        await waitFor(() => expect(result.current.inline.isSuccess).toBe(true));
        expect(api.getServices).toHaveBeenCalledTimes(1);

        await act(() => result.current.create.mutateAsync({ name: 'Polerowanie' } as never));

        await waitFor(() => expect(api.getServices).toHaveBeenCalledTimes(2));
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(api.getServices).toHaveBeenCalledTimes(2);
    });
});
