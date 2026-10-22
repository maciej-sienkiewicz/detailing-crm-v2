// @vitest-environment jsdom
//
// Zgłoszenie: Kalendarz → Wydarzenie → Urlop → pracownik → klik w JEDEN dzień otwierał
// okno szybkiej rezerwacji, a pod nim potwierdzenie urlopu. Jedno kliknięcie myszą
// FullCalendar zgłasza dwa razy (`select`, potem `dateClick`) z osobnych nasłuchów
// `mouseup`, a React zdąży między nimi przerenderować - drugie wywołanie dostaje już
// nowe propsy. Atrapa odtwarza dokładnie to: `select`, flush, `dateClick` z bieżących propsów.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { forwardRef, useEffect, useImperativeHandle, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { CalendarNavigationProvider } from '@/common/context/CalendarNavigationContext';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            email: 'r@studio.pl',
            permissions: ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE', 'EMPLOYEES_MANAGE'],
        },
        setUser: vi.fn(),
    }),
}));

type CalendarProps = {
    select?: (arg: unknown) => void;
    dateClick?: (arg: unknown) => void;
};
let latestProps: CalendarProps = {};

vi.mock('@fullcalendar/react', () => ({
    default: forwardRef((props: CalendarProps, ref) => {
        // Jak prawdziwy kalendarz: po każdym renderze obsługa zdarzeń jest już ta nowa.
        useEffect(() => { latestProps = props; });
        useImperativeHandle(ref, () => ({
            getApi: () => ({
                unselect: () => {}, updateSize: () => {}, changeView: () => {}, today: () => {},
                prev: () => {}, next: () => {}, gotoDate: () => {}, getDate: () => new Date(),
                view: { type: 'dayGridMonth' },
            }),
        }));
        return null;
    }),
}));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

vi.mock('./QuickEventModal', () => ({
    QuickEventModal: forwardRef(({ isOpen }: { isOpen: boolean }, _ref) =>
        isOpen ? <div data-testid="quick-event-modal">Nowa rezerwacja</div> : null),
}));

vi.mock('./LeaveFlowModals', () => ({
    LeaveSetupModal: ({ onConfirm }: { onConfirm: (draft: unknown) => void }) => (
        <button
            type="button"
            onClick={() => onConfirm({ employeeId: 'e1', employeeName: 'Anna Nowak', leaveType: 'VACATION' })}
        >
            dalej do dni
        </button>
    ),
    LeaveConfirmModal: ({ range }: { range: { startDate: string; endDate: string } }) => (
        <div data-testid="leave-confirm">{`${range.startDate}..${range.endDate}`}</div>
    ),
}));

vi.mock('@/widgets/Sidebar/context/SidebarContext', () => ({
    useSidebar: () => ({ isCollapsed: false }),
}));

import { CalendarView } from './CalendarView';

const wrap = (children: ReactNode) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <MemoryRouter initialEntries={['/calendar']}>
                    <CalendarNavigationProvider>{children}</CalendarNavigationProvider>
                </MemoryRouter>
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

const day = new Date('2026-06-05T00:00:00');
const view = { type: 'dayGridMonth' };

/** Jedno kliknięcie myszą w dzień, tak jak zgłasza je FullCalendar. */
const clickOneDay = async () => {
    await act(async () => {
        latestProps.select?.({ start: day, end: new Date('2026-06-06T00:00:00'), allDay: true, view, jsEvent: null });
    });
    await act(async () => {
        latestProps.dateClick?.({ date: day, allDay: true, view, jsEvent: new MouseEvent('mouseup') });
    });
};

const startLeaveFlow = () => {
    fireEvent.click(screen.getAllByText('Wydarzenie')[0]);
    fireEvent.click(screen.getAllByText('Urlop')[0]);
    fireEvent.click(screen.getByText('dalej do dni'));
};

afterEach(cleanup);

describe('CalendarView - urlop na jeden dzień', () => {
    it('klik w jeden dzień otwiera samo potwierdzenie urlopu, bez szybkiej rezerwacji', async () => {
        render(wrap(<CalendarView />));
        startLeaveFlow();

        await clickOneDay();

        expect(screen.getByTestId('leave-confirm').textContent).toBe('2026-06-05..2026-06-05');
        expect(screen.queryByTestId('quick-event-modal')).toBeNull();
    });

    it('bez urlopu ten sam klik dalej otwiera szybką rezerwację', async () => {
        render(wrap(<CalendarView />));

        await clickOneDay();

        expect(screen.getByTestId('quick-event-modal')).toBeTruthy();
        expect(screen.queryByTestId('leave-confirm')).toBeNull();
    });
});
