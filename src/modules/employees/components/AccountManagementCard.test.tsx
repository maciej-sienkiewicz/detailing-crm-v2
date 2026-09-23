// @vitest-environment jsdom
//
// Konto założone z zaproszeniem nie jest zablokowane od pierwszej sekundy, więc karta
// pokazywała „Konto aktywne", zanim pracownik w ogóle otworzył e-mail. Te testy pilnują,
// że takie konto czeka na aktywację i że zaproszenie da się wysłać ponownie.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { teamApi } from '@/modules/settings/api/teamApi';
import { rolesApi } from '@/modules/settings/api/rolesApi';
import { AccountManagementCard } from './AccountManagementCard';
import type { EmployeeAccountInfo, EmployeeDetail } from '../types';

vi.mock('@/modules/settings/api/teamApi', () => ({
    teamApi: { resendInvitation: vi.fn() },
}));

vi.mock('@/modules/settings/api/rolesApi', () => ({
    rolesApi: { listRoles: vi.fn(), assignRole: vi.fn() },
}));

const employee = (account: Partial<EmployeeAccountInfo> | null): EmployeeDetail => ({
    id: 'emp-1',
    userId: account ? 'user-1' : null,
    firstName: 'Anna',
    lastName: 'Nowak',
    fullName: 'Anna Nowak',
    phone: null,
    email: 'anna@firma.pl',
    account: account && {
        userId: 'user-1',
        roleId: null,
        isActive: true,
        hasPinConfigured: false,
        email: 'anna.nowak@example.com',
        ...account,
    },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
});

const pendingAccount: Partial<EmployeeAccountInfo> = {
    invitationPending: true,
    invitationSentAt: '2026-09-21T12:05:00Z',
    invitationExpiresAt: '2026-09-23T12:05:00Z',
};

const renderCard = (detail: EmployeeDetail) => {
    const onChanged = vi.fn();
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AccountManagementCard employee={detail} onChanged={onChanged} onEmployeeDeleted={vi.fn()} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onChanged };
};

const resendButton = () => screen.queryByRole('button', { name: /wyślij maila ponownie/i });

beforeEach(() => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([]);
    vi.mocked(teamApi.resendInvitation).mockReset();
});

describe('AccountManagementCard - konto czekające na aktywację', () => {
    it('konto z wysłanym zaproszeniem nie udaje aktywnego i mówi, dokąd poszedł e-mail', () => {
        renderCard(employee(pendingAccount));

        expect(screen.getByText('Czeka na aktywację')).toBeTruthy();
        expect(screen.queryByText('Konto aktywne')).toBeNull();
        expect(screen.getByText(/Pracownik jeszcze nie aktywował konta/).textContent)
            .toContain('na anna.nowak@example.com');
        expect(resendButton()).toBeTruthy();
    });

    it('„Wyślij maila ponownie" wysyła nowe zaproszenie i odświeża kartę', async () => {
        vi.mocked(teamApi.resendInvitation).mockResolvedValue({
            sentAt: '2026-09-23T10:00:00Z',
            expiresAt: '2026-09-25T10:00:00Z',
        });
        const { onChanged } = renderCard(employee(pendingAccount));

        await userEvent.click(resendButton()!);

        expect(teamApi.resendInvitation).toHaveBeenCalledTimes(1);
        expect(vi.mocked(teamApi.resendInvitation).mock.calls[0][0]).toBe('emp-1');
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        expect(await screen.findByText('Zaproszenie wysłane ponownie')).toBeTruthy();
    });

    it('po aktywacji: „Konto aktywne" i bez ponownej wysyłki', () => {
        renderCard(employee({ invitationPending: false }));

        expect(screen.getByText('Konto aktywne')).toBeTruthy();
        expect(resendButton()).toBeNull();
    });

    it('zablokowane konto nie dostaje zaproszenia - najpierw trzeba je aktywować', () => {
        renderCard(employee({ ...pendingAccount, isActive: false }));

        expect(screen.getByText('Konto zablokowane')).toBeTruthy();
        expect(resendButton()).toBeNull();
        expect(screen.getByRole('button', { name: /aktywuj konto/i })).toBeTruthy();
    });
});
