// @vitest-environment jsdom
//
// Saldo SMS jest na serwerze za modułem z kredytami (COMM_SMS_CREDITS) i uprawnieniem
// COMMUNICATION_SEND. Bez nich licznik w menu Ustawień kończył się 402/403 przy każdym wejściu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSmsCreditBalance } from './useSmsCredits';

const access = vi.hoisted(() => ({ module: true, permissions: ['COMMUNICATION_SEND'] as string[] }));
const getBalance = vi.hoisted(() => vi.fn(async () => ({ availableCredits: 120 })));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can: (code: string) => access.permissions.includes(code) }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: access.module }) }));
vi.mock('../api/smsCreditApi', () => ({ smsCreditApi: { getBalance } }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    access.module = true;
    access.permissions = ['COMMUNICATION_SEND'];
});

describe('useSmsCreditBalance', () => {
    it('bez modułu z kredytami nie pyta o saldo', async () => {
        access.module = false;
        renderHook(() => useSmsCreditBalance(), { wrapper });
        await settle();
        expect(getBalance).not.toHaveBeenCalled();
    });

    it('bez uprawnienia COMMUNICATION_SEND nie pyta o saldo', async () => {
        access.permissions = [];
        renderHook(() => useSmsCreditBalance(), { wrapper });
        await settle();
        expect(getBalance).not.toHaveBeenCalled();
    });

    it('z modułem i uprawnieniem czyta saldo, chyba że wołający je wyłączy', async () => {
        const { result } = renderHook(() => useSmsCreditBalance(), { wrapper });
        await waitFor(() => expect(result.current.data?.availableCredits).toBe(120));

        vi.clearAllMocks();
        renderHook(() => useSmsCreditBalance({ enabled: false }), { wrapper });
        await settle();
        expect(getBalance).not.toHaveBeenCalled();
    });
});
