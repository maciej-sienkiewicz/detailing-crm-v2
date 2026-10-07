// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 07.10: „Sesja zablokowana" - wystarczyło otworzyć aplikację
// w nowej karcie, żeby ją ominąć. Blokada jest teraz na serwerze i dociera do
// każdej karty: tej, która ją założyła, pozostałych otwartych (sygnał) i nowych
// (ProtectedRoute pokazuje sam ekran blokady zamiast aplikacji).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// ProtectedRoute bierze useNavigate z 'react-router' - router z tego samego pakietu.
import { MemoryRouter } from 'react-router';
import type { User } from '@/modules/auth/types';
import { SESSION_LOCKED_EVENT, resetActivityThrottleForTests } from '../sessionLock';

const auth = vi.hoisted(() => ({
    value: {
        user: null as Partial<User> | null,
        isAuthenticated: true,
        isLoading: false,
        refreshUser: vi.fn(),
    },
}));
vi.mock('./AuthContext', () => ({ useAuth: () => auth.value }));

const authApi = vi.hoisted(() => ({ lockSession: vi.fn() }));
vi.mock('@/modules/auth/api/authApi', () => ({ authApi }));

vi.mock('@/modules/pin-switcher', () => ({
    UserSwitcherPanel: ({ onClose, lockMode }: { onClose: () => void; lockMode?: boolean }) => (
        <div role="dialog" aria-label="Sesja zablokowana">
            {lockMode && 'tryb blokady'}
            <button type="button" onClick={onClose}>PIN poprawny</button>
        </div>
    ),
}));
vi.mock('../components/SubscriptionGate', () => ({ SubscriptionGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { IdleTimeoutProvider } from './IdleTimeoutProvider';
import { ProtectedRoute } from '../components/ProtectedRoute';

const MINUTE = 60_000;
const SIGNAL_KEY = 'crm_session_lock_signal';

const renderApp = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <IdleTimeoutProvider><p>formularz w toku</p></IdleTimeoutProvider>
    </QueryClientProvider>,
);

const lockScreen = () => screen.queryByRole('dialog', { name: 'Sesja zablokowana' });

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 12, 0));
    auth.value.user = { userId: 'u1', idleTimeoutSeconds: 15 * 60 };
    auth.value.isAuthenticated = true;
    auth.value.refreshUser.mockResolvedValue(undefined);
    authApi.lockSession.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    resetActivityThrottleForTests();
});

describe('IdleTimeoutProvider - blokada po bezczynności', () => {
    it('po czasie bez ruchu zakłada blokadę NA SERWERZE i daje znać innym kartom', () => {
        renderApp();
        act(() => { vi.advanceTimersByTime(15 * MINUTE); });

        expect(lockScreen()).not.toBeNull();
        expect(authApi.lockSession).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem(SIGNAL_KEY)).toMatch(/^locked:/);
        // Aplikacja pod nakładką zostaje - po PIN-ie formularz jest tam, gdzie był.
        expect(screen.getByText('formularz w toku')).toBeTruthy();
    });

    it('praca w innej karcie nie pozwala zablokować sesji karcie leżącej w tle', () => {
        renderApp();
        act(() => { vi.advanceTimersByTime(10 * MINUTE); });
        // Inna karta zapisała aktywność.
        localStorage.setItem('crm_last_activity', String(Date.now()));
        act(() => { vi.advanceTimersByTime(5 * MINUTE); });
        expect(lockScreen()).toBeNull();
        expect(authApi.lockSession).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(10 * MINUTE); });
        expect(lockScreen()).not.toBeNull();
    });

    it('blokada założona w innej karcie zasłania tę od razu, bez drugiego zapytania', () => {
        renderApp();
        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: SIGNAL_KEY, newValue: 'locked:1' }));
        });
        expect(lockScreen()).not.toBeNull();
        expect(authApi.lockSession).not.toHaveBeenCalled();
    });

    it('odpowiedź 423 z serwera też pokazuje ekran blokady', () => {
        renderApp();
        act(() => { window.dispatchEvent(new CustomEvent(SESSION_LOCKED_EVENT)); });
        expect(lockScreen()).not.toBeNull();
    });

    it('PIN w innej karcie odblokowuje tę i odświeża dane osoby, która weszła', async () => {
        renderApp();
        act(() => { window.dispatchEvent(new CustomEvent(SESSION_LOCKED_EVENT)); });
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', { key: SIGNAL_KEY, newValue: 'unlocked:2' }));
        });
        expect(lockScreen()).toBeNull();
        expect(auth.value.refreshUser).toHaveBeenCalledTimes(1);
    });

    it('udany PIN w tej karcie zdejmuje nakładkę i liczy bezczynność od nowa', () => {
        renderApp();
        act(() => { vi.advanceTimersByTime(15 * MINUTE); });
        fireEvent.click(screen.getByRole('button', { name: 'PIN poprawny' }));
        expect(lockScreen()).toBeNull();

        act(() => { vi.advanceTimersByTime(14 * MINUTE); });
        expect(lockScreen()).toBeNull();
    });
});

describe('ProtectedRoute - nowa karta zablokowanej sesji', () => {
    const renderRoute = () => render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                <ProtectedRoute><p>dane studia</p></ProtectedRoute>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    it('pokazuje sam ekran blokady zamiast aplikacji', () => {
        auth.value.user = { userId: 'u1', sessionLocked: true, permissions: [] };
        renderRoute();
        expect(lockScreen()?.textContent).toContain('tryb blokady');
        expect(screen.queryByText('dane studia')).toBeNull();
    });

    it('PIN w innej karcie pyta serwer, kto teraz jest zalogowany', async () => {
        auth.value.user = { userId: 'u1', sessionLocked: true, permissions: [] };
        renderRoute();
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', { key: SIGNAL_KEY, newValue: 'unlocked:3' }));
        });
        expect(auth.value.refreshUser).toHaveBeenCalledTimes(1);
    });

    it('sesja bez blokady wpuszcza do aplikacji', () => {
        auth.value.user = { userId: 'u1' };
        renderRoute();
        expect(screen.getByText('dane studia')).toBeTruthy();
        expect(lockScreen()).toBeNull();
    });
});
