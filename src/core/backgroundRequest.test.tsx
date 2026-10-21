// @vitest-environment jsdom
//
// Odświeżenie z timera nie wyrzuca na /login (skipAuthRedirect), pierwsze wczytanie tak.
// Dawniej po wygaśnięciu sesji polling przenosił na logowanie w połowie formularza.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { backgroundRequest, type BackgroundRequestConfig } from './backgroundRequest';

afterEach(() => cleanup());

describe('backgroundRequest', () => {
    it('pierwsze wczytanie przekierowuje, odświeżenie z danymi na ekranie - nie', async () => {
        const configs: BackgroundRequestConfig[] = [];
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useQuery({
            queryKey: ['poll'],
            queryFn: async context => { configs.push(backgroundRequest(context)); return configs.length; },
        }), { wrapper });
        await waitFor(() => expect(result.current.data).toBe(1));

        await result.current.refetch();

        expect(configs.map(config => config.skipAuthRedirect)).toEqual([false, true]);
        expect(configs[0].signal).toBeInstanceOf(AbortSignal);
    });
});
