// @vitest-environment jsdom
//
// Kolory do wyboru mają jeden klucz: filtry kalendarza, okno rezerwacji i kreator przyjęcia
// dzielą jedno pobranie, a zmiana w Ustawieniach odświeża je wszystkie naraz.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/core', () => ({ apiClient: http }));

import { appointmentColorsQuery } from './appointmentColorsQuery';
import { useCreateAppointmentColor } from '../hooks/useAppointmentColors';

const wrapperWith = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('appointmentColorsQuery', () => {
    it('kilka widoków naraz pyta serwer raz', async () => {
        http.get.mockResolvedValue({ data: { colors: [{ id: 'c1' }], pagination: {} } });
        const wrapper = wrapperWith(new QueryClient());

        const { result } = renderHook(() => [
            useQuery(appointmentColorsQuery()),
            useQuery(appointmentColorsQuery()),
            useQuery(appointmentColorsQuery()),
        ], { wrapper });

        await waitFor(() => expect(result.current[0].data).toEqual([{ id: 'c1' }]));
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get).toHaveBeenCalledWith('/v1/appointment-colors', { params: { page: 1, limit: 100 } });
    });

    it('nowy kolor z Ustawień odświeża listę do wyboru', async () => {
        http.get.mockResolvedValueOnce({ data: { colors: [{ id: 'c1' }], pagination: {} } });
        http.get.mockResolvedValueOnce({ data: { colors: [{ id: 'c1' }, { id: 'c2' }], pagination: {} } });
        http.post.mockResolvedValue({ data: { id: 'c2' } });
        const wrapper = wrapperWith(new QueryClient());

        const { result } = renderHook(() => ({
            picker: useQuery(appointmentColorsQuery()),
            create: useCreateAppointmentColor(),
        }), { wrapper });
        await waitFor(() => expect(result.current.picker.data).toHaveLength(1));

        await act(() => result.current.create.mutateAsync({ name: 'Nowy', hexColor: '#000000' }));

        await waitFor(() => expect(result.current.picker.data).toHaveLength(2));
        expect(http.get).toHaveBeenCalledTimes(2);
    });
});
