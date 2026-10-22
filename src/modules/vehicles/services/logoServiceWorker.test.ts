// Cache logotypów w Service Workerze (public/service-worker.js): do cache trafia tylko udana
// odpowiedź (dawniej także nieprzezroczyste 404 - na zawsze), offline nie zostawia
// „Uncaught (in promise) TypeError: Failed to fetch", a przycinanie logo bierze tę samą kopię.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const SCRIPT = readFileSync(new URL('../../../../public/service-worker.js', import.meta.url), 'utf8');
const LOGO = 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/bmw.png';

function loadWorker(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
    const listeners = new Map<string, (event: unknown) => void>();
    const store = new Map<string, Response>();
    const cache = {
        match: vi.fn(async (url: string) => store.get(url)?.clone()),
        put: vi.fn(async (url: string, response: Response) => { store.set(url, response); }),
    };
    const self = { addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn) };
    const fetchMock = vi.fn(fetchImpl);
    new Function('self', 'caches', 'fetch', 'clients', SCRIPT)(self, { open: async () => cache, keys: async () => [] }, fetchMock, {});

    // <img> prosi w trybie no-cors z destination 'image'; przycinanie logo - fetch-em w trybie CORS.
    const request = async (mode: RequestMode, destination: string = mode === 'no-cors' ? 'image' : '') => {
        let responded: Promise<Response> | undefined;
        listeners.get('fetch')!({ request: { url: LOGO, mode, destination }, respondWith: (p: Promise<Response>) => { responded = p; } });
        return responded;
    };
    return { request, cache, fetchMock };
}

describe('Service Worker - logotypy marek', () => {
    it('udane logo trafia do cache i obsługuje też przycinanie (CORS), bez drugiego pobrania', async () => {
        const sw = loadWorker(async () => new Response('png', { status: 200 }));

        expect((await sw.request('no-cors'))!.status).toBe(200);
        expect((await sw.request('cors'))!.status).toBe(200);

        expect(sw.fetchMock).toHaveBeenCalledTimes(1);
        expect(sw.fetchMock.mock.calls[0][1]).toMatchObject({ mode: 'cors' });
    });

    it('404 nie trafia do cache - następne wejście pyta ponownie', async () => {
        const sw = loadWorker(async () => new Response('', { status: 404 }));

        await sw.request('no-cors');

        expect(sw.cache.put).not.toHaveBeenCalled();
    });

    it('offline: błąd sieci zamienia się w pustą odpowiedź, nie w nieobsłużone odrzucenie', async () => {
        const sw = loadWorker(async () => { throw new TypeError('Failed to fetch'); });

        const response = await sw.request('no-cors');

        expect(response!.type).toBe('error');
    });

    it('nie przechwytuje niczego poza obrazkiem i przycinaniem logo (np. nawigacji)', async () => {
        const sw = loadWorker(async () => new Response('png', { status: 200 }));

        expect(await sw.request('navigate', 'document')).toBeUndefined();
        expect(sw.fetchMock).not.toHaveBeenCalled();
    });
});
