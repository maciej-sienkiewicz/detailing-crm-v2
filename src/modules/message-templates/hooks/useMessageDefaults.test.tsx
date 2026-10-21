// @vitest-environment jsdom
//
// Ustawienia automatyzacji SMS i e-mail są na serwerze za modułem wiadomości
// (COMM_SEND_TRANSACTIONAL) i uprawnieniem COMMUNICATION_SEND. Bez nich zapytanie
// kończyło się 402/403 przy każdym otwarciu kalendarza i okien przyjęcia.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMessageDefaults } from './useMessageDefaults';
import { useMessageAutomationAccess } from './useMessageAutomationAccess';

const access = vi.hoisted(() => ({ module: true, permissions: ['COMMUNICATION_SEND'] as string[] }));
const fetchAutomationConfig = vi.hoisted(() => vi.fn(async () => ({ preVisit: { checkedByDefault: true } })));
const fetchEmailAutomationConfig = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can: (code: string) => access.permissions.includes(code) }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: access.module }) }));
vi.mock('@/modules/sms-settings/api/smsSettingsApi', () => ({ fetchAutomationConfig }));
vi.mock('@/modules/email-campaigns/api/emailCampaignsApi', () => ({ fetchEmailAutomationConfig }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    access.module = true;
    access.permissions = ['COMMUNICATION_SEND'];
});

describe('useMessageAutomationAccess', () => {
    it.each([
        [true, ['COMMUNICATION_SEND'], true],
        [false, ['COMMUNICATION_SEND'], false],
        [true, [], false],
    ])('moduł %s, uprawnienia %j → %s', (module, permissions, expected) => {
        access.module = module;
        access.permissions = permissions;
        const { result } = renderHook(() => useMessageAutomationAccess());
        expect(result.current).toBe(expected);
    });
});

describe('useMessageDefaults', () => {
    it('bez uprawnienia nie pyta serwera i zostawia stan zapasowy', async () => {
        access.permissions = [];

        const { result } = renderHook(() => useMessageDefaults(), { wrapper });
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(fetchAutomationConfig).not.toHaveBeenCalled();
        expect(fetchEmailAutomationConfig).not.toHaveBeenCalled();
        expect(result.current.sms('preVisit')).toBeUndefined();
    });

    it('z modułem i uprawnieniem czyta ustawienia', async () => {
        const { result } = renderHook(() => useMessageDefaults(), { wrapper });

        await waitFor(() => expect(result.current.sms('preVisit')).toBe(true));
        expect(fetchEmailAutomationConfig).toHaveBeenCalledTimes(1);
    });
});
