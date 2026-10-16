// @vitest-environment jsdom
//
// Nowa rezerwacja wymaga danych osobowych obok VISITS_CREATE (personalDataActions).
// Kto ich nie ma, nie dostaje okna szybkiej rezerwacji po kliknięciu w wolny termin
// i nie widzi przycisków „Rezerwacja" ani „Wizyta" w nagłówku kalendarza.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { CalendarNavigationProvider } from '@/common/context/CalendarNavigationContext';

let permissions: string[] | null = [];
vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'r@studio.pl', permissions }, setUser: vi.fn() }),
}));

// FullCalendar w jsdom: zamiast siatki jeden przycisk, który zgłasza zaznaczenie
// wolnego dnia tak, jak robi to prawdziwy kalendarz (`select`).
vi.mock('@fullcalendar/react', () => ({
    default: forwardRef((props: { select?: (arg: unknown) => void }, ref) => {
        useImperativeHandle(ref, () => ({
            getApi: () => ({
                unselect: () => {}, updateSize: () => {}, changeView: () => {}, today: () => {},
                prev: () => {}, next: () => {}, gotoDate: () => {}, getDate: () => new Date(),
                view: { type: 'dayGridMonth' },
            }),
        }));
        return (
            <button
                type="button"
                onClick={() => props.select?.({
                    start: new Date('2026-06-05T00:00:00'),
                    end: new Date('2026-06-06T00:00:00'),
                    allDay: true,
                    view: { type: 'dayGridMonth' },
                    jsEvent: null,
                })}
            >
                wolny termin
            </button>
        );
    }),
}));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

vi.mock('./QuickEventModal', () => ({
    QuickEventModal: forwardRef(({ isOpen }: { isOpen: boolean }, _ref) =>
        isOpen ? <div data-testid="quick-event-modal">Nowa rezerwacja</div> : null),
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

afterEach(cleanup);

describe('CalendarView - nowa rezerwacja a dane osobowe', () => {
    it('bez danych osobowych klik w wolny termin nie otwiera formularza rezerwacji', () => {
        permissions = ['VISITS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        render(wrap(<CalendarView />));

        fireEvent.click(screen.getByText('wolny termin'));

        expect(screen.queryByTestId('quick-event-modal')).toBeNull();
        expect(screen.queryByText('Rezerwacja')).toBeNull();
        expect(screen.queryByText('Wizyta')).toBeNull();
    });

    it('z danymi osobowymi klik w wolny termin otwiera formularz rezerwacji', () => {
        permissions = ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        render(wrap(<CalendarView />));

        fireEvent.click(screen.getByText('wolny termin'));

        expect(screen.getByTestId('quick-event-modal')).toBeTruthy();
        expect(screen.getByText('Rezerwacja')).toBeTruthy();
        expect(screen.getByText('Wizyta')).toBeTruthy();
    });
});
