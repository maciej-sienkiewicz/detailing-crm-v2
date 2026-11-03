// @vitest-environment jsdom
//
// Zgłoszenie 03.11.2026: „właściciel stworzył swoją stopkę i nadpisał ją pracownikowi".
// Na wspólnym komputerze osoby przełączają się PIN-em, a cache zapytań przeżywał zmianę
// osoby: stopka e-mail jednej osoby (5 minut świeżości) pokazywała się drugiej jako jej
// własna, a kreator otwarty na cudzych danych zapisywał je na konto następnej osoby.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import type { User } from '@/modules/auth/types';

const authApi = vi.hoisted(() => ({ checkAuth: vi.fn() }));
vi.mock('@/modules/auth/api/authApi', () => ({ authApi }));

const prefetch = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/modules/settings/hooks/useSubscription', () => ({ prefetchSubscriptionStatus: prefetch }));
vi.mock('@/core/socketClient', () => ({ disconnectStompClient: vi.fn(() => Promise.resolve()) }));

import { AuthProvider, useAuth } from './AuthContext';

const SIGNATURE_KEY = ['comms', 'signature'];

const person = (userId: string, firstName: string): User => ({
    userId,
    studioId: 'studio-1',
    email: `${firstName.toLowerCase()}@studio.pl`,
    firstName,
    role: userId === 'owner' ? 'OWNER' : 'USER',
    subscriptionStatus: 'ACTIVE',
    trialDaysRemaining: 0,
});

const owner = person('owner', 'Jan');
const employee = person('employee', 'Anna');

let auth: ReturnType<typeof useAuth>;
/** Każdy zatwierdzony render: kto jest zalogowany i czyja stopka leżała w cache. */
let renders: { userId: string | undefined; signature: unknown }[];

/** Wartości czytane w renderze, zapisywane po zatwierdzeniu - to, co zobaczył użytkownik. */
function Probe({ client }: { client: QueryClient }) {
    const ctx = useAuth();
    const signature = client.getQueryData(SIGNATURE_KEY);
    useLayoutEffect(() => {
        auth = ctx;
        renders.push({ userId: ctx.user?.userId, signature });
    });
    return null;
}

const mount = async (sessionUser: User | null = owner) => {
    authApi.checkAuth.mockResolvedValue({ isAuthenticated: Boolean(sessionUser), user: sessionUser ?? undefined });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <AuthProvider><Probe client={client} /></AuthProvider>
        </QueryClientProvider>,
    );
    await waitFor(() => expect(auth.isLoading).toBe(false));
    return client;
};

beforeEach(() => {
    renders = [];
    vi.clearAllMocks();
});

afterEach(cleanup);

describe('AuthContext: cache zapytań należy do jednej osoby', () => {
    it('przełączenie PIN-em na inną osobę wyrzuca stopkę poprzedniej', async () => {
        const client = await mount(owner);
        client.setQueryData(SIGNATURE_KEY, { bodyHtml: '<div>Jan Właściciel</div>' });

        act(() => auth.setUser(employee));

        expect(client.getQueryData(SIGNATURE_KEY)).toBeUndefined();
        expect(auth.user?.userId).toBe('employee');
    });

    it('żaden render nowej osoby nie widzi cache poprzedniej', async () => {
        const client = await mount(owner);
        client.setQueryData(SIGNATURE_KEY, { bodyHtml: '<div>Jan Właściciel</div>' });
        renders = [];

        act(() => auth.setUser(employee));

        const employeeRenders = renders.filter(r => r.userId === 'employee');
        expect(employeeRenders.length).toBeGreaterThan(0);
        expect(employeeRenders.every(r => r.signature === undefined)).toBe(true);
    });

    it('po zmianie osoby status pakietu jest pobierany od nowa (bramka nie czeka na pusty cache)', async () => {
        await mount(owner);
        prefetch.mockClear();

        act(() => auth.setUser(employee));

        expect(prefetch).toHaveBeenCalledTimes(1);
    });

    it('ta sama osoba (odświeżenie uprawnień po 403) zachowuje cache', async () => {
        const client = await mount(owner);
        client.setQueryData(SIGNATURE_KEY, { bodyHtml: '<div>Jan Właściciel</div>' });

        act(() => auth.setUser({ ...owner, permissions: ['LEADS_MANAGE'] }));

        expect(client.getQueryData(SIGNATURE_KEY)).toEqual({ bodyHtml: '<div>Jan Właściciel</div>' });
    });

    it('wylogowanie czyści cache - ekran logowania nie trzyma danych poprzedniej osoby', async () => {
        const client = await mount(owner);
        client.setQueryData(SIGNATURE_KEY, { bodyHtml: '<div>Jan Właściciel</div>' });

        act(() => auth.setAuthenticated(false));

        expect(client.getQueryData(SIGNATURE_KEY)).toBeUndefined();
    });

    it('odblokowanie w innej karcie przez inną osobę (refreshUser) czyści cache', async () => {
        const client = await mount(owner);
        client.setQueryData(SIGNATURE_KEY, { bodyHtml: '<div>Jan Właściciel</div>' });
        authApi.checkAuth.mockResolvedValue({ isAuthenticated: true, user: employee });

        await act(() => auth.refreshUser());

        expect(client.getQueryData(SIGNATURE_KEY)).toBeUndefined();
        expect(auth.user?.userId).toBe('employee');
    });

    it('start aplikacji nie wyrzuca danych pobranych przed odpowiedzią /auth/me', async () => {
        authApi.checkAuth.mockResolvedValue({ isAuthenticated: true, user: owner });
        const client = new QueryClient();
        client.setQueryData(['subscription', 'status'], { status: 'ACTIVE' });

        render(
            <QueryClientProvider client={client}>
                <AuthProvider><Probe client={client} /></AuthProvider>
            </QueryClientProvider>,
        );
        await waitFor(() => expect(auth.user?.userId).toBe('owner'));

        expect(client.getQueryData(['subscription', 'status'])).toEqual({ status: 'ACTIVE' });
    });
});
