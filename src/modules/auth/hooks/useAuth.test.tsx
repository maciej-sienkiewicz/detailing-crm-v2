// @vitest-environment jsdom
//
// Ciasteczko sesji jest wspólne dla kart. Logowanie hasłem na inne konto podmienia osobę
// także w karcie otwartej obok - a ta dalej pokazywała poprzednią i jej zapisy (np. stopka
// e-mail, zgłoszenie 03.11.2026) szły na nowe konto. Po logowaniu idzie ten sam sygnał co
// po PIN-ie, na który inne karty pytają /auth/me, kto jest teraz zalogowany.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const authApi = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../api/authApi', () => ({ authApi }));
vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ setAuthenticated: vi.fn(), setUser: vi.fn() }),
}));

import { onLockSignal } from '@/core/sessionLock';
import { useLogin } from './useAuth';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
);

afterEach(() => localStorage.clear());

describe('useLogin', () => {
    it('daje znać innym kartom, że w sesji może być teraz inna osoba', async () => {
        authApi.login.mockResolvedValue({ success: true, user: { userId: 'employee' } });
        const { result } = renderHook(() => useLogin(), { wrapper });

        await act(() => result.current.mutateAsync({ email: 'anna@studio.pl', password: 'x', rememberMe: false }));

        await waitFor(() => expect(localStorage.getItem('crm_session_lock_signal')).toMatch(/^unlocked:/));
    });

    it('inna karta odbiera to jako odblokowanie (odpyta /auth/me)', () => {
        const handler = vi.fn();
        const unsubscribe = onLockSignal(handler);

        window.dispatchEvent(new StorageEvent('storage', { key: 'crm_session_lock_signal', newValue: `unlocked:${Date.now()}` }));

        expect(handler).toHaveBeenCalledWith(false);
        unsubscribe();
    });
});
