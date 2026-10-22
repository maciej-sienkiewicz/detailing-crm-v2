// @vitest-environment jsdom
//
// Telefon przy przyjęciu nie zna pojazdu. Zanim kod QR niósł schemat mapy, telefon przy
// motocyklu zawsze otwierał sedana, a komputer pokazywał motocykl - punkty stawiane na
// telefonie lądowały na innym rysunku niż ten, który widział pracownik przy biurku.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/core', () => ({ apiClient: { post: (...args: unknown[]) => post(...args) } }));

import { checkinApi } from '../api/checkinApi';
import { useCheckinQRToken } from './useCheckinQRToken';

const TOKEN = {
    token: 't-1',
    checkinId: 'c-1',
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    uploadEndpoint: '/api/mobile/checkin/photos',
};

afterEach(() => {
    cleanup();
    post.mockReset();
    vi.restoreAllMocks();
});

describe('checkinApi.generateQRToken - schemat mapy dla telefonu', () => {
    it('wysyła schemat jako parametr vehicleType', async () => {
        post.mockResolvedValue({ data: TOKEN });

        await checkinApi.generateQRToken('c-1', { vehicleType: 'motorcycle' });

        expect(post).toHaveBeenCalledWith(
            '/v1/checkin/c-1/upload-token',
            null,
            { params: { rotate: false, vehicleType: 'motorcycle' } },
        );
    });

    it('bez schematu nie wysyła parametru wcale - serwer niczego nie zasiewa', async () => {
        post.mockResolvedValue({ data: TOKEN });

        await checkinApi.generateQRToken('c-1', { rotate: true });

        expect(post.mock.calls[0][2]).toEqual({ params: { rotate: true } });
    });
});

describe('useCheckinQRToken - schemat przy wydaniu kodu', () => {
    it('prosi o kod z bieżącym schematem pojazdu', async () => {
        const generate = vi.spyOn(checkinApi, 'generateQRToken').mockResolvedValue(TOKEN);

        renderHook(() => useCheckinQRToken('c-1', 'motorcycle'));

        await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
        expect(generate).toHaveBeenCalledWith('c-1', { rotate: false, vehicleType: 'motorcycle' });
    });

    it('zmiana schematu nie wydaje kodu od nowa, ale następne pobranie niesie nowy', async () => {
        /*
         * Serwer zasiewa telefon schematem tylko raz, więc ponowne pytanie o kod przy
         * każdej zmianie schematu niczego by nie dało poza mignięciem „Generowanie kodu".
         * Odświeżenie (np. przed wygaśnięciem) bierze już schemat bieżący.
         */
        const generate = vi.spyOn(checkinApi, 'generateQRToken').mockResolvedValue(TOKEN);

        const { result, rerender } = renderHook(
            ({ type }) => useCheckinQRToken('c-1', type),
            { initialProps: { type: 'sedan' } },
        );
        await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));

        rerender({ type: 'motorcycle' });
        expect(generate).toHaveBeenCalledTimes(1);

        await act(() => result.current.refresh());
        expect(generate).toHaveBeenLastCalledWith('c-1', { rotate: false, vehicleType: 'motorcycle' });
    });
});
