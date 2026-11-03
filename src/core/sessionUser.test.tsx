// @vitest-environment jsdom
//
// Zgłoszenie 03.11.2026: właściciel nadpisał pracownikowi stopkę e-mail. Jedna z dróg:
// w karcie obok ktoś przełączył się PIN-em na pracownika, a karta właściciela nie dostała
// sygnału (localStorage zablokowany, karta uśpiona) i zapisała stopkę - na konto osoby
// z sesji. Teraz każdy zapis niesie osobę pokazaną w karcie, a serwer odrzuca go, gdy
// w sesji jest już ktoś inny.
//
// Prawdziwy AuthProvider i apiClient; atrapą jest tylko serwer (adapter axiosa), który
// sprawdza nagłówek jak ExpectedSessionUserFilter i odpowiada na /auth/me osobą z sesji.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import type { User } from '@/modules/auth/types';

vi.mock('@/modules/settings/hooks/useSubscription', () => ({ prefetchSubscriptionStatus: () => Promise.resolve() }));
vi.mock('@/core/socketClient', () => ({ disconnectStompClient: () => Promise.resolve() }));

import { apiClient } from './apiClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EXPECTED_USER_HEADER, SESSION_USER_CHANGED, expectedUserFor, setShownUser } from './sessionUser';

const person = (userId: string, firstName: string): User => ({
    userId, studioId: 'studio-1', email: `${firstName.toLowerCase()}@studio.pl`, firstName,
    role: userId === 'owner' ? 'OWNER' : 'USER', subscriptionStatus: 'ACTIVE', trialDaysRemaining: 0,
});
const owner = person('owner', 'Jan');
const employee = person('employee', 'Anna');

/** „Serwer": osoba w sesji, zapisy, które doszły, i nagłówki wszystkich żądań. */
const server = { sessionUserId: 'owner', saved: [] as { by: string; data: unknown }[], seen: [] as InternalAxiosRequestConfig[] };

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status < 400) return Promise.resolve(response);
    return Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, response, isAxiosError: true }));
};

const fakeServer: AxiosAdapter = async config => {
    server.seen.push(config);
    if (config.url?.endsWith('/auth/me')) {
        return respond(config, 200, { success: true, user: server.sessionUserId === 'owner' ? owner : employee });
    }
    const expected = config.headers?.[EXPECTED_USER_HEADER] as string | undefined;
    if (expected && expected !== server.sessionUserId) {
        return respond(config, 409, {
            status: 409, code: SESSION_USER_CHANGED, title: 'Zalogowana jest inna osoba',
            detail: 'Zmiana nie jest zapisana. W tej przeglądarce zalogowała się w międzyczasie inna osoba.',
            type: 'about:blank', fieldErrors: [],
        });
    }
    server.saved.push({ by: server.sessionUserId, data: config.data });
    return respond(config, 200, {});
};

let auth: ReturnType<typeof useAuth>;
function Probe() {
    const ctx = useAuth();
    useLayoutEffect(() => { auth = ctx; });
    return null;
}

const originalAdapter = apiClient.defaults.adapter;

const mountAs = async (user: User) => {
    server.sessionUserId = user.userId;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(auth.user?.userId).toBe(user.userId));
    return client;
};

beforeEach(() => {
    server.saved = [];
    server.seen = [];
    apiClient.defaults.adapter = fakeServer;
});

afterEach(() => {
    cleanup();
    apiClient.defaults.adapter = originalAdapter;
    setShownUser(null);
});

describe('Zapis z karty, która nie zauważyła zmiany osoby', () => {
    it('zapis właściciela w sesji pracownika nie dochodzi do serwera, a karta przełącza się na pracownika', async () => {
        const client = await mountAs(owner);
        client.setQueryData(['comms', 'signature'], { bodyHtml: '<div>Jan Właściciel</div>' });
        const errors: string[] = [];
        const onError = (e: Event) => errors.push((e as CustomEvent<{ message: string }>).detail.message);
        window.addEventListener('api:error', onError);

        // Druga karta: PIN pracownika. Ta karta nie dostała sygnału.
        server.sessionUserId = 'employee';
        await expect(apiClient.put('/v1/comms/signature', { bodyHtml: '<div>Jan Właściciel</div>' }))
            .rejects.toMatchObject({ response: { status: 409 } });

        expect(server.saved).toEqual([]);
        await waitFor(() => expect(auth.user?.userId).toBe('employee'));
        expect(client.getQueryData(['comms', 'signature'])).toBeUndefined();
        expect(errors).toEqual(['Zmiana nie jest zapisana. W tej przeglądarce zalogowała się w międzyczasie inna osoba.']);
        window.removeEventListener('api:error', onError);
    });

    it('odmowa idzie dymkiem także z okna, które błędy pokazuje u siebie - to okno zaraz znika', async () => {
        await mountAs(owner);
        const errors: string[] = [];
        const onError = (e: Event) => errors.push((e as CustomEvent<{ message: string }>).detail.message);
        window.addEventListener('api:error', onError);

        server.sessionUserId = 'employee';
        await apiClient.put('/v1/comms/signature', {}, { skipErrorToast: true }).catch(() => {});

        expect(errors).toHaveLength(1);
        window.removeEventListener('api:error', onError);
    });

    it('po przełączeniu karta zapisuje już jako pracownik', async () => {
        await mountAs(owner);
        server.sessionUserId = 'employee';
        await apiClient.put('/v1/comms/signature', {}).catch(() => {});
        await waitFor(() => expect(auth.user?.userId).toBe('employee'));

        await apiClient.put('/v1/comms/signature', { bodyHtml: '<div>Anna Pracownik</div>' });

        expect(server.saved).toHaveLength(1);
        expect(server.saved[0].by).toBe('employee');
    });

    it('przełączenie PIN-em w tej karcie od razu zmienia osobę w nagłówku', async () => {
        await mountAs(owner);

        act(() => auth.setUser(employee));
        server.sessionUserId = 'employee';
        await apiClient.post('/v1/visits/v1/notes', { text: 'x' });

        expect(server.saved).toHaveLength(1);
        expect(server.seen.at(-1)?.headers?.[EXPECTED_USER_HEADER]).toBe('employee');
    });

    it('odczyty idą bez nagłówka - niczego nie zmieniają', async () => {
        await mountAs(owner);

        await apiClient.get('/v1/visits');

        expect(server.seen.at(-1)?.headers?.[EXPECTED_USER_HEADER]).toBeUndefined();
    });

    it('po wylogowaniu zapisy idą bez nagłówka (ekran logowania, strony publiczne)', async () => {
        await mountAs(owner);

        act(() => auth.setAuthenticated(false));

        expect(expectedUserFor('post')).toBeUndefined();
    });
});
