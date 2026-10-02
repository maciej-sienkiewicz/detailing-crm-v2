// @vitest-environment jsdom
//
// Okno pracownika (zatwierdzona makieta): nagłówek bez awatara z rolą do zmiany jednym
// kliknięciem i ostatnią aktywnością, zakładki Urlopy / Czas pracy / Dokumenty / Zarobki /
// Ustawienia (bez „Przeglądu"), a reset hasła i usuwanie konta w „Ustawieniach".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { EmployeeDetail } from '../../types';
import { EmployeeModal } from './EmployeeModal';

const auth = vi.hoisted(() => ({ user: { userId: 'me', permissions: null as string[] | null } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

const api = vi.hoisted(() => ({
    getEmployee: vi.fn(),
    listLeaves: vi.fn(),
    getTeamWorkTimePeriods: vi.fn(),
    sendPasswordReset: vi.fn(),
}));
vi.mock('../../api/employeeApi', () => ({ employeeApi: api }));

const roles = vi.hoisted(() => ({
    listRoles: vi.fn(),
    assignRole: vi.fn(),
}));
vi.mock('@/modules/settings/api/rolesApi', () => ({ rolesApi: roles }));

const leaveQueue = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/leaveRequestsApi')>()),
    leaveRequestsApi: leaveQueue,
}));

// Dziś: piątek 2 października 2026, 10:00.
const NOW = new Date(2026, 9, 2, 10, 0);

const anna = (over: Partial<EmployeeDetail> = {}): EmployeeDetail => ({
    id: 'e-anna', userId: 'u-anna', firstName: 'Anna', lastName: 'Nowak', fullName: 'Anna Nowak',
    phone: '600 100 200', email: 'anna@studio.pl', createdAt: '2025-03-12T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z',
    account: {
        userId: 'u-anna', roleId: 'det', isActive: true, hasPinConfigured: true, email: 'anna@studio.pl',
        invitationPending: false, lastLoginAt: new Date(2026, 9, 1, 18, 42).toISOString(),
        lastSeenAt: new Date(2026, 9, 1, 18, 42).toISOString(),
    },
    ...over,
});

const renderModal = (employee: EmployeeDetail = anna()) => {
    api.getEmployee.mockResolvedValue(employee);
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <EmployeeModal employeeId={employee.id} onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

/** Wypełnione przyciski w oknie (CLAUDE.md §2: najwyżej jeden). */
const filledButtons = () => document.querySelectorAll(
    '[role="dialog"] [data-variant="primary"], [role="dialog"] [data-variant="success"], [role="dialog"] [data-variant="danger"]',
);

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    auth.user = { userId: 'me', permissions: null };
    api.listLeaves.mockResolvedValue([
        { id: 'l1', employeeId: 'e-anna', leaveType: 'ANNUAL', startDate: '2026-08-03', endDate: '2026-08-14', daysCount: 12, note: null, createdAt: '' },
        { id: 'l2', employeeId: 'e-anna', leaveType: 'SICK', startDate: '2026-09-08', endDate: '2026-09-09', daysCount: 2, note: null, createdAt: '' },
        { id: 'l3', employeeId: 'e-anna', leaveType: 'UNPAID', startDate: '2025-11-14', endDate: '2025-11-14', daysCount: 1, note: null, createdAt: '' },
    ]);
    api.getTeamWorkTimePeriods.mockResolvedValue([
        { period: '2026-09', label: 'Wrzesień 2026', status: 'SUBMITTED', totalMinutes: 9120, totalHours: '152:00', entryCount: 19, overtimeMinutes: 0, overtimeHours: '0:00', returnNote: null },
    ]);
    leaveQueue.list.mockResolvedValue({
        pendingCount: 1,
        items: [{
            id: 'r1', number: 'WU/2026/0012', employeeId: 'e-anna', employeeName: 'Anna Nowak', leaveType: 'ANNUAL',
            onDemand: false, startDate: '2026-12-23', endDate: '2026-12-24', workingDays: 2, status: 'PENDING',
            reason: null, origin: 'SELF', createdByName: null, createdAt: '', employeeSignedAt: '', decidedAt: null,
            decidedByName: null, decisionNote: null, cancelReason: null,
        }],
    });
    roles.listRoles.mockResolvedValue([
        { id: 'lead', name: 'Kierownik zmiany', description: 'Zatwierdza urlopy i karty.', permissions: [], trackWorkTime: true, assignedUserCount: 1, createdAt: '', updatedAt: '' },
        { id: 'det', name: 'Detailer', description: 'Wizyty i własny czas pracy.', permissions: [], trackWorkTime: true, assignedUserCount: 3, createdAt: '', updatedAt: '' },
    ]);
    roles.assignRole.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('EmployeeModal - nagłówek i zakładki', () => {
    it('nazwisko, rola, ostatnia aktywność i kontakt - bez awatara z inicjałami', async () => {
        renderModal();
        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        expect(await within(dialog).findByRole('button', { name: /Detailer/ })).toBeTruthy();
        expect(within(dialog).getByText('Ostatnio w aplikacji: wczoraj, 18:42')).toBeTruthy();
        expect(within(dialog).getByText('600 100 200')).toBeTruthy();
        expect(within(dialog).getByText('anna@studio.pl')).toBeTruthy();
        expect(within(dialog).queryByText('AN')).toBeNull();
    });

    it('zakładki: Urlopy, Czas pracy, Dokumenty, Zarobki, Ustawienia - bez „Przeglądu"', async () => {
        renderModal();
        await screen.findByRole('dialog', { name: 'Anna Nowak' });
        expect(screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '')))
            .toEqual(['Urlopy', 'Czas pracy', 'Dokumenty', 'Zarobki', 'Ustawienia']);
        expect(screen.getByRole('tab', { name: /^Urlopy/ }).getAttribute('aria-selected')).toBe('true');
        // Liczniki: wniosek tej osoby do decyzji i złożona karta.
        expect(await screen.findByRole('tab', { name: /^Urlopy\s*1$/ })).toBeTruthy();
        expect(await screen.findByRole('tab', { name: /^Czas pracy\s*1$/ })).toBeTruthy();
    });

    it('zmiana roli z nagłówka działa od razu', async () => {
        renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Detailer/ }));
        fireEvent.click(await screen.findByRole('menuitem', { name: /Kierownik zmiany/ }));
        await waitFor(() => expect(roles.assignRole).toHaveBeenCalledWith('u-anna', 'lead'));
        expect(await screen.findByText('Rola zmieniona')).toBeTruthy();
    });

    it('bez konta zamiast roli stoi „Bez konta", a obecność mówi, że się nie loguje', async () => {
        renderModal(anna({ userId: null, account: null }));
        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        expect(within(dialog).getByText('Nie loguje się do aplikacji')).toBeTruthy();
        expect(within(dialog).queryByRole('button', { name: /Detailer/ })).toBeNull();
    });
});

describe('EmployeeModal - Urlopy', () => {
    it('suma dni w tym roku, wniosek do decyzji i historia latami - bez zdań „Najbliższy" i „Czeka na Twoją decyzję"', async () => {
        renderModal();
        // 12 + 2 dni z 2026; urlop z 2025 się nie liczy.
        expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === '14 dni urlopu w 2026')).toBeTruthy();
        expect(await screen.findByText('23.12–24.12.2026')).toBeTruthy();
        expect(screen.getByText('Czeka na decyzję')).toBeTruthy();
        expect(screen.getByRole('heading', { name: /^2025/ })).toBeTruthy();
        expect(screen.queryByText(/Najbliższy/)).toBeNull();
        expect(screen.queryByText(/Czeka na Twoją decyzję/)).toBeNull();
    });
});

describe('EmployeeModal - Ustawienia', () => {
    const openSettings = async () => {
        await screen.findByRole('dialog', { name: 'Anna Nowak' });
        fireEvent.click(screen.getByRole('tab', { name: /^Ustawienia/ }));
    };

    it('ostatnie logowanie, a „Resetuj hasło" wysyła link po potwierdzeniu', async () => {
        api.sendPasswordReset.mockResolvedValue({
            email: 'anna@studio.pl', sentAt: NOW.toISOString(), expiresAt: new Date(2026, 9, 2, 10, 30).toISOString(),
        });
        renderModal();
        await openSettings();
        expect(screen.getByText('1 października 2026, 18:42')).toBeTruthy();
        expect(filledButtons()).toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: /Resetuj hasło/ }));
        expect(api.sendPasswordReset).not.toHaveBeenCalled();
        // Otwarte potwierdzenie przejmuje okno - jego „Wyślij link" jest jedynym wypełnieniem.
        expect(filledButtons()).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij link' }));

        await waitFor(() => expect(api.sendPasswordReset).toHaveBeenCalledWith('e-anna'));
        expect(await screen.findByText('Link wysłany')).toBeTruthy();
    });

    it('właściciel widzi blokadę, usunięcie konta i usunięcie pracownika', async () => {
        renderModal();
        await openSettings();
        expect(screen.getByRole('button', { name: /Zablokuj konto/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Usuń konto/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Usuń pracownika/ })).toBeTruthy();
    });

    it('kadrowa rola bez właściciela nie dostaje przycisków usuwania, których backend jej odmówi', async () => {
        auth.user = { userId: 'me', permissions: ['EMPLOYEES_MANAGE'] };
        renderModal();
        await openSettings();
        expect(screen.getByRole('button', { name: /Zablokuj konto/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Usuń konto/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Usuń pracownika/ })).toBeNull();
    });

    it('bez konta jedyną wypełnioną akcją jest „Utwórz konto"', async () => {
        renderModal(anna({ userId: null, account: null }));
        await openSettings();
        expect(screen.getByRole('button', { name: /Utwórz konto/ }).getAttribute('data-variant')).toBe('primary');
        expect(filledButtons()).toHaveLength(1);
    });
});
