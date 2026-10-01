// @vitest-environment jsdom
//
// Strona karty czasu pracy (zamiast okna, w którym na telefonie nie dało się przewinąć
// całego miesiąca). Cały miesiąc dzień po dniu, a na dole tylko akcje pasujące do statusu:
// złożona - zatwierdź (jedyne wypełnienie) albo zwróć z notatką; zatwierdzona - odblokuj;
// niezłożona - przypomnij; własna - jedno zdanie, bez przycisków.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import {
    worktimeMonthsApi, type CardDay, type CardDetail, type MonthOverview, type MonthSheet,
} from '../api/worktimeMonthsApi';
import { filledIn } from '../components/leave/leaveTestHelpers';
import { WorkTimeCardView } from './WorkTimeCardView';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'me', permissions: null } }) }));
vi.mock('../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: {
        getMonth: vi.fn(),
        getCard: vi.fn(),
        approveCard: vi.fn(),
        returnCard: vi.fn(),
        remind: vi.fn(),
        createSheet: vi.fn(),
        pendingCount: vi.fn(),
    },
}));

const api = vi.mocked(worktimeMonthsApi);

/** Wrzesień 2026: 30 dni, 1.09 to wtorek. */
const septemberDays = (): CardDay[] => Array.from({ length: 30 }, (_, i) => {
    const date = `2026-09-${String(i + 1).padStart(2, '0')}`;
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const working = weekday !== 0 && weekday !== 6;
    return {
        date,
        minutes: working ? 480 : null,
        note: i === 0 ? 'Mycie floty' : null,
        isWorkingDay: working,
        holidayName: null,
        leave: i === 1 ? { type: 'SICK', label: 'L4' } : null,
        missing: false,
    };
}).map(d => (d.date === '2026-09-30' ? { ...d, minutes: null, missing: true } : d));

const card = (overrides: Partial<CardDetail> = {}): CardDetail => ({
    userId: 'anna',
    employeeId: 'e-anna',
    name: 'Anna Nowak',
    status: 'SUBMITTED',
    totalMinutes: 8250,
    expectedMinutes: 9120,
    missingWorkingDays: 2,
    overtimeMinutes: 90,
    leaveWorkingDays: 2,
    submittedAt: '2026-09-30T10:00:00Z',
    approvedAt: null,
    approvedByName: null,
    returnNote: null,
    canDecide: true,
    remindedAt: null,
    period: '2026-09',
    label: 'Wrzesień 2026',
    days: septemberDays(),
    returnedAt: null,
    returnedByName: null,
    ...overrides,
});

const month = (sheet: MonthSheet | null = null): MonthOverview => ({
    period: '2026-09',
    label: 'Wrzesień 2026',
    workingDays: 21,
    stage: 'REVIEWING',
    counts: { total: 1, notSubmitted: 0, submitted: 1, returned: 0, approved: 0 },
    employees: [card()],
    sheet,
    sheetHistory: [],
});

const renderCard = (detail: CardDetail, overview: MonthOverview = month()) => {
    api.getCard.mockResolvedValue(detail);
    api.getMonth.mockResolvedValue(overview);
    const router = createMemoryRouter([
        { path: '/employees/worktime', element: <p>widok miesiąca</p> },
        { path: '/employees/worktime/:period/:userId', element: <WorkTimeCardView /> },
    ], { initialEntries: [`/employees/worktime/2026-09/${detail.userId}`] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <RouterProvider router={router} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return router;
};

const actionBar = () => screen.getByLabelText('Decyzja o karcie');

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0));
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('Strona karty czasu pracy - treść', () => {
    it('nagłówek, jedno zdanie podsumowania i wszystkie dni miesiąca', async () => {
        renderCard(card());
        expect(await screen.findByRole('heading', { level: 1, name: 'Anna Nowak' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Listy miesięczne, wrzesień 2026/ }))
            .toHaveAttribute('href', '/employees/worktime?period=2026-09');
        expect(screen.getByText('Karta czasu pracy, wrzesień 2026')).toBeInTheDocument();
        expect(screen.getByText('Do zatwierdzenia')).toBeInTheDocument();
        expect(screen.getByText('Brakuje 2 dni roboczych. Nadgodziny 1:30 h. Urlop i L4: 2 dni.')).toBeInTheDocument();

        const days = within(screen.getByRole('list', { name: 'Dni miesiąca' })).getAllByRole('listitem');
        expect(days).toHaveLength(30);
        expect(within(days[0]).getByText('Mycie floty')).toBeInTheDocument();
        expect(within(days[1]).getByText('L4')).toBeInTheDocument();
        expect(days[5].getAttribute('data-kind')).toBe('weekend');
        expect(within(days[29]).getByText('brak wpisu')).toBeInTheDocument();
        // Bez strzałek do innych osób.
        expect(screen.queryByRole('button', { name: /Następna osoba|Poprzednia osoba/ })).toBeNull();
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });
});

describe('Strona karty czasu pracy - akcje zależne od statusu', () => {
    it('złożona: „Zatwierdź kartę" (jedyne wypełnienie) i „Zwróć do poprawy" w obwódce', async () => {
        renderCard(card());
        const approve = await screen.findByRole('button', { name: 'Zatwierdź kartę' });
        const ret = screen.getByRole('button', { name: 'Zwróć do poprawy' });
        expect(Array.from(filledIn(document.body))).toEqual([approve]);
        expect(ret.getAttribute('data-variant')).toBe('outline');
        expect(within(actionBar()).getAllByRole('button')).toHaveLength(2);
    });

    it('zatwierdzenie wraca do widoku miesiąca z komunikatem', async () => {
        api.approveCard.mockResolvedValue(card({ status: 'APPROVED' }));
        const router = renderCard(card());
        fireEvent.click(await screen.findByRole('button', { name: 'Zatwierdź kartę' }));
        await waitFor(() => expect(router.state.location.pathname).toBe('/employees/worktime'));
        expect(router.state.location.search).toBe('?period=2026-09');
        expect(api.approveCard).toHaveBeenCalledWith('anna', '2026-09');
        expect(await screen.findByText('Karta zatwierdzona')).toBeInTheDocument();
    });

    it('zwrot do poprawy wymaga notatki, potem wraca do widoku miesiąca', async () => {
        api.returnCard.mockResolvedValue(card({ status: 'RETURNED' }));
        const router = renderCard(card());
        fireEvent.click(await screen.findByRole('button', { name: 'Zwróć do poprawy' }));
        const dialog = await screen.findByRole('dialog', { name: 'Zwróć do poprawy' });

        fireEvent.click(within(dialog).getByRole('button', { name: 'Zwróć kartę' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent(/Napisz, co trzeba poprawić/);
        expect(api.returnCard).not.toHaveBeenCalled();

        fireEvent.change(within(dialog).getByLabelText('Co trzeba poprawić?'), { target: { value: '  Brakuje 30.09  ' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Zwróć kartę' }));
        await waitFor(() => expect(api.returnCard).toHaveBeenCalledWith('anna', '2026-09', 'Brakuje 30.09'));
        await waitFor(() => expect(router.state.location.pathname).toBe('/employees/worktime'));
        expect(await screen.findByText('Karta zwrócona do poprawy')).toBeInTheDocument();
    });

    it('zatwierdzona: tylko „Odblokuj kartę", z ostrzeżeniem o ponownym podpisie listy', async () => {
        api.returnCard.mockResolvedValue(card({ status: 'RETURNED' }));
        const signed: MonthSheet = {
            id: 's1', status: 'APPROVED', outdated: false, generatedAt: '2026-10-01T08:00:00Z',
            approvedAt: '2026-10-01T08:05:00Z', approvedByName: 'Maciej Sienkiewicz', excludedNames: [],
        };
        renderCard(card({ status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z' }), month(signed));
        const unlock = await screen.findByRole('button', { name: 'Odblokuj kartę' });
        expect(within(actionBar()).getAllByRole('button')).toEqual([unlock]);
        expect(filledIn(document.body)).toHaveLength(0);

        fireEvent.click(unlock);
        const dialog = await screen.findByRole('dialog', { name: 'Odblokuj kartę' });
        expect(await within(dialog).findByText(/trzeba będzie podpisać ją ponownie/)).toBeInTheDocument();
        fireEvent.change(within(dialog).getByLabelText('Co trzeba poprawić?'), { target: { value: 'Nadgodziny z 12.09' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Odblokuj kartę' }));
        await waitFor(() => expect(api.returnCard).toHaveBeenCalledWith('anna', '2026-09', 'Nadgodziny z 12.09'));
    });

    it('w trakcie: „Przypomnij" wysyła przypomnienie tej osobie', async () => {
        api.remind.mockResolvedValue({ reminded: ['anna'], skipped: [] });
        renderCard(card({ status: 'DRAFT', canDecide: false }));
        const remind = await screen.findByRole('button', { name: 'Przypomnij' });
        expect(within(actionBar()).getAllByRole('button')).toEqual([remind]);
        expect(filledIn(document.body)).toHaveLength(0);
        fireEvent.click(remind);
        await waitFor(() => expect(api.remind).toHaveBeenCalledWith('2026-09', ['anna']));
        expect(await screen.findByText('Przypomnienie wysłane')).toBeInTheDocument();
    });

    it('przypomnienie wygaszone z powodem, gdy poszło mniej niż 12 h temu', async () => {
        renderCard(card({ status: 'NOT_STARTED', canDecide: false, remindedAt: '2026-10-01T06:00:00Z' }));
        expect(await screen.findByRole('button', { name: 'Przypomnij' })).toBeDisabled();
        expect(screen.getByText(/Kolejne przypomnienie po 12 godzinach/)).toBeInTheDocument();
    });

    it('zwrócona: notatka ze zwrotu i przypomnienie', async () => {
        renderCard(card({ status: 'RETURNED', canDecide: false, returnNote: 'Brakuje 30.09' }));
        expect(await screen.findByText('Uwagi przy zwrocie: Brakuje 30.09')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Przypomnij' })).toBeEnabled();
    });

    it('własna złożona karta: jedno zdanie, bez przycisków', async () => {
        renderCard(card({ userId: 'me', name: 'Maciej Sienkiewicz', canDecide: false }));
        expect(await screen.findByText('Własnej karty nie zatwierdzasz.')).toBeInTheDocument();
        expect(within(actionBar()).queryByRole('button')).toBeNull();
    });

    it('własna niezłożona karta: nie przypomina się samemu sobie', async () => {
        renderCard(card({ userId: 'me', name: 'Maciej Sienkiewicz', status: 'DRAFT', canDecide: false }));
        await screen.findByRole('heading', { level: 1, name: 'Maciej Sienkiewicz' });
        expect(screen.queryByRole('button', { name: 'Przypomnij' })).toBeNull();
    });
});
