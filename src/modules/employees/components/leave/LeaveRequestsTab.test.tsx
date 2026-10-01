// @vitest-environment jsdom
//
// Kolejka wniosków: administrator (EMPLOYEES_MANAGE) dodaje tu urlop bez wniosku - wpis
// idzie wprost do rejestru urlopów. Sam rozpatrujący (EMPLOYEES_LEAVES_APPROVE) tego
// przycisku nie ma, bo wpis do rejestru to uprawnienie kadrowe.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { employeeApi } from '../../api/employeeApi';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import { todayIso } from '../../utils/leaveRequestFormat';
import { LeaveRequestsTab } from './LeaveRequestsTab';

const auth = vi.hoisted(() => ({ user: { permissions: null as string[] | null } }));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

vi.mock('../../api/employeeApi', () => ({
    employeeApi: {
        listEmployees: vi.fn(),
        getLeaveCalendar: vi.fn(),
        addLeave: vi.fn(),
    },
}));
vi.mock('../../api/leaveRequestsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/leaveRequestsApi')>()),
    leaveRequestsApi: { list: vi.fn() },
}));

const month = todayIso().slice(0, 7);

const renderTab = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <LeaveRequestsTab />
                    </ToastProvider>
                </ThemeProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    auth.user = { permissions: null };
    vi.mocked(employeeApi.listEmployees).mockResolvedValue({
        items: [{ id: 'p', firstName: 'Piotr', lastName: 'Lis', fullName: 'Piotr Lis', email: null, phone: null, hasAccount: true }],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 100 },
    });
    vi.mocked(employeeApi.getLeaveCalendar).mockResolvedValue([]);
    vi.mocked(leaveRequestsApi.list).mockResolvedValue({ items: [], pendingCount: 0 });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LeaveRequestsTab - dodanie urlopu', () => {
    it('administrator dodaje urlop: osoba, termin na kalendarzu, wpis do rejestru', async () => {
        vi.mocked(employeeApi.addLeave).mockResolvedValue({ leaveId: 'l1' });
        renderTab();

        fireEvent.click(await screen.findByRole('button', { name: /Dodaj urlop/ }));
        const dialog = await screen.findByRole('dialog', { name: 'Dodaj urlop' });
        await within(dialog).findByRole('option', { name: 'Piotr Lis' });
        fireEvent.change(within(dialog).getByLabelText('Pracownik'), { target: { value: 'p' } });

        // Środek miesiąca: dni 14-16 są w siatce jednoznaczne (bez końcówek sąsiednich miesięcy).
        fireEvent.click(within(dialog).getAllByRole('button', { name: 'Wybierz dzień' })[0]);
        const picker = await screen.findByRole('dialog', { name: 'Wybór zakresu dat' });
        fireEvent.click(within(picker).getByRole('button', { name: '14' }));
        fireEvent.click(within(picker).getByRole('button', { name: '16' }));
        fireEvent.click(within(picker).getByRole('button', { name: 'Gotowe' }));

        fireEvent.click(within(dialog).getByRole('button', { name: 'Dodaj urlop' }));
        await waitFor(() => expect(employeeApi.addLeave).toHaveBeenCalledWith('p', {
            leaveType: 'ANNUAL', startDate: `${month}-14`, endDate: `${month}-16`, note: null,
        }));
        expect(await screen.findByText('Urlop dodany')).toBeTruthy();
    });

    it('bez wybranego terminu okno mówi, czego brakuje, i nic nie wysyła', async () => {
        renderTab();
        fireEvent.click(await screen.findByRole('button', { name: /Dodaj urlop/ }));
        const dialog = await screen.findByRole('dialog', { name: 'Dodaj urlop' });
        await within(dialog).findByRole('option', { name: 'Piotr Lis' });
        fireEvent.change(within(dialog).getByLabelText('Pracownik'), { target: { value: 'p' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Dodaj urlop' }));

        expect(await within(dialog).findByText('Wybierz w kalendarzu pierwszy i ostatni dzień.')).toBeTruthy();
        expect(employeeApi.addLeave).not.toHaveBeenCalled();
    });

    it('sam rozpatrujący wnioski nie dodaje urlopu', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        renderTab();
        await screen.findByText(/Oczekujące/);
        expect(screen.queryByRole('button', { name: /Dodaj urlop/ })).toBeNull();
        expect(employeeApi.listEmployees).not.toHaveBeenCalled();
    });
});
