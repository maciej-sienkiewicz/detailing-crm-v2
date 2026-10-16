// @vitest-environment jsdom
//
// Zgłoszenie: zdjęcia sprzed przyjęcia nie trafiały do wizyty. Krok zdjęć montuje się
// od nowa przy każdym „Wstecz"/„Dalej", a każde zamontowanie zakładało NOWĄ, pustą sesję
// zdjęć - pierwsze kolejne zdjęcie zastępowało w formularzu wszystkie wcześniejsze.
// Do tego nieudany upload do S3 udawał sukces, bo fetch nie rzuca przy 4xx/5xx.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
    createUploadSession: vi.fn(async () => ({ sessionId: 's-1', token: 't', expiresAt: '' })),
    getSessionPhotos: vi.fn(async () => ({ photos: [] })),
}));
vi.mock('../api/checkinApi', async importOriginal => {
    const actual = await importOriginal<typeof import('../api/checkinApi')>();
    return { checkinApi: { ...actual.checkinApi, ...api } };
});

import { usePhotoUpload } from './usePhotoUpload';
import { checkinApi } from '../api/checkinApi';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('usePhotoUpload - jedna sesja zdjęć na przyjęcie', () => {
    it('ten sam wizardKey po ponownym zamontowaniu kroku używa tej samej sesji', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

        const first = renderHook(() => usePhotoUpload('r-1', 'przyjecie-1'), { wrapper });
        await waitFor(() => expect(first.result.current.uploadSession?.sessionId).toBe('s-1'));
        first.unmount();

        // „Wstecz" i „Dalej": krok zdjęć montuje się od nowa w tym samym przyjęciu.
        const second = renderHook(() => usePhotoUpload('r-1', 'przyjecie-1'), { wrapper });
        await waitFor(() => expect(second.result.current.uploadSession?.sessionId).toBe('s-1'));

        expect(api.createUploadSession).toHaveBeenCalledTimes(1);
    });

    it('inne przyjęcie dostaje własną sesję', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

        const first = renderHook(() => usePhotoUpload(undefined, 'walk-in-1'), { wrapper });
        await waitFor(() => expect(first.result.current.uploadSession).toBeDefined());
        const second = renderHook(() => usePhotoUpload(undefined, 'walk-in-2'), { wrapper });
        await waitFor(() => expect(second.result.current.uploadSession).toBeDefined());

        expect(api.createUploadSession).toHaveBeenCalledTimes(2);
    });
});

describe('checkinApi.uploadToS3', () => {
    it('odpowiedź S3 inna niż 2xx to błąd, a nie „przesłane"', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
        const file = new File(['x'], 'przod.jpg', { type: 'image/jpeg' });

        await expect(checkinApi.uploadToS3('https://s3/podpisany', file)).rejects.toThrow('HTTP 403');
    });

    it('odpowiedź 2xx przechodzi', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const file = new File(['x'], 'przod.jpg', { type: 'image/jpeg' });

        await expect(checkinApi.uploadToS3('https://s3/podpisany', file)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith('https://s3/podpisany', expect.objectContaining({ method: 'PUT', body: file }));
    });
});
