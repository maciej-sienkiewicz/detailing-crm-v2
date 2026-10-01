// @vitest-environment jsdom
//
// Grafik nieobecności: pewna nieobecność to pełna komórka, wniosek oczekujący - kreskowana
// (i tylko u tego, kto rozpatruje). L4 wpisuje ten, kto zarządza zespołem.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { employeeApi } from '../../api/employeeApi';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import { todayIso } from '../../utils/leaveRequestFormat';
import { AbsencesTab } from './AbsencesTab';

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
const day = (d: number) => `${month}-${String(d).padStart(2, '0')}`;

const renderTab = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AbsencesTab />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    auth.user = { permissions: null };
    vi.mocked(employeeApi.listEmployees).mockResolvedValue({
        items: [
            { id: 'a', firstName: 'Anna', lastName: 'Nowak', fullName: 'Anna Nowak', email: null, phone: null, hasAccount: true },
            { id: 'p', firstName: 'Piotr', lastName: 'Lis', fullName: 'Piotr Lis', email: null, phone: null, hasAccount: true },
        ],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 2, itemsPerPage: 100 },
    });
    vi.mocked(employeeApi.getLeaveCalendar).mockResolvedValue([
        { date: day(3), count: 1, employees: [{ id: 'p', fullName: 'Piotr Lis' }] },
    ]);
    vi.mocked(leaveRequestsApi.list).mockResolvedValue({
        items: [{
            id: 'r1', number: 'WU/2026/0001', employeeId: 'a', employeeName: 'Anna Nowak', leaveType: 'ANNUAL',
            onDemand: false, startDate: day(5), endDate: day(6), workingDays: 2, status: 'PENDING', reason: null,
            createdAt: '', employeeSignedAt: null, decidedAt: null,
            decidedByName: null, decisionNote: null, cancelReason: null,
        }],
        pendingCount: 1,
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AbsencesTab', () => {
    it('nieobecność pewna i wniosek oczekujący mają osobne komórki', async () => {
        renderTab();
        expect(await screen.findByLabelText(`Piotr Lis, ${day(3)}: nieobecność`)).toBeTruthy();
        expect(await screen.findByLabelText(`Anna Nowak, ${day(5)}: wniosek oczekuje`)).toBeTruthy();
        expect(screen.getByLabelText(`Anna Nowak, ${day(6)}: wniosek oczekuje`)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Dodaj nieobecność \(L4\)/ })).toBeTruthy();
    });

    it('bez prawa do rozpatrywania oczekujących wniosków nie widać i nikt o nie nie pyta', async () => {
        auth.user = { permissions: ['EMPLOYEES_MANAGE'] };
        renderTab();
        await screen.findByLabelText(`Piotr Lis, ${day(3)}: nieobecność`);
        expect(screen.queryByLabelText(`Anna Nowak, ${day(5)}: wniosek oczekuje`)).toBeNull();
        expect(leaveRequestsApi.list).not.toHaveBeenCalled();
    });

    it('sam kierownik zmiany nie wpisuje L4', async () => {
        auth.user = { permissions: ['EMPLOYEES_LEAVES_APPROVE'] };
        renderTab();
        await screen.findByLabelText(`Piotr Lis, ${day(3)}: nieobecność`);
        expect(screen.queryByRole('button', { name: /Dodaj nieobecność/ })).toBeNull();
    });

    it('L4 idzie do rejestru urlopów jako SICK', async () => {
        vi.mocked(employeeApi.addLeave).mockResolvedValue({ leaveId: 'l1' });
        renderTab();
        fireEvent.click(await screen.findByRole('button', { name: /Dodaj nieobecność \(L4\)/ }));
        await screen.findByRole('option', { name: 'Piotr Lis' });
        fireEvent.change(screen.getByLabelText('Pracownik'), { target: { value: 'p' } });
        fireEvent.click(screen.getByRole('button', { name: 'Wpisz zwolnienie' }));
        await vi.waitFor(() => expect(employeeApi.addLeave).toHaveBeenCalledWith('p', expect.objectContaining({ leaveType: 'SICK' })));
    });
});
