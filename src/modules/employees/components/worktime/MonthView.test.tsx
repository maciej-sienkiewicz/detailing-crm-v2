// @vitest-environment jsdom
//
// Zakładka „Czas pracy" po uproszczeniu (uwagi właściciela: „za dużo labelek, za dużo
// przycisków, wiele ścieżek do tego samego modalu, badge tylko informacyjne"): jedno
// zdanie podsumowania i lista osób, w której wiersz jest jedyną drogą do okna karty.
// Listy obecności mają osobną zakładkę - tu nie ma po nich śladu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import {
    worktimeMonthsApi, type CardDetail, type MonthCardRow, type MonthOverview,
} from '../../api/worktimeMonthsApi';
import { MonthView } from './MonthView';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'me', permissions: null } }) }));

vi.mock('../../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: {
        getMonth: vi.fn(),
        getCard: vi.fn(),
        approveCard: vi.fn(),
        returnCard: vi.fn(),
        remind: vi.fn(),
        pendingCount: vi.fn(),
    },
}));
const api = vi.mocked(worktimeMonthsApi);

const row = (userId: string, name: string, overrides: Partial<MonthCardRow> = {}): MonthCardRow => ({
    userId,
    employeeId: `e-${userId}`,
    name,
    status: 'SUBMITTED',
    totalMinutes: 9120,
    expectedMinutes: 10080,
    missingWorkingDays: 0,
    overtimeMinutes: 0,
    leaveWorkingDays: 0,
    submittedAt: '2026-09-30T10:00:00Z',
    approvedAt: null,
    approvedByName: null,
    returnNote: null,
    canDecide: true,
    remindedAt: null,
    ...overrides,
});

const card = (userId: string, name: string): CardDetail => ({
    ...row(userId, name),
    period: '2026-09',
    label: 'Wrzesień 2026',
    days: [],
    returnedAt: null,
    returnedByName: null,
});

const month = (overrides: Partial<MonthOverview> = {}): MonthOverview => {
    const employees = overrides.employees ?? [];
    const count = (pred: (r: MonthCardRow) => boolean) => employees.filter(pred).length;
    return {
        period: '2026-09',
        label: 'Wrzesień 2026',
        workingDays: 21,
        stage: 'COLLECTING',
        counts: {
            total: employees.length,
            notSubmitted: count(r => r.status === 'NOT_STARTED' || r.status === 'DRAFT'),
            submitted: count(r => r.status === 'SUBMITTED'),
            returned: count(r => r.status === 'RETURNED'),
            approved: count(r => r.status === 'APPROVED'),
        },
        employees,
        sheet: null,
        sheetHistory: [],
        ...overrides,
    };
};

const serve = (overview: MonthOverview) => {
    api.getMonth.mockResolvedValue(overview);
};

const renderAt = (path = '/employees/worktime?period=2026-09') => {
    const router = createMemoryRouter([
        { path: '/employees/worktime', element: <MonthView /> },
    ], { initialEntries: [path] });
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

const ANNA = row('anna', 'Anna Nowak');

beforeEach(() => {
    vi.clearAllMocks();
    // Dziś 1 października: bez `?period` widok otwiera wrzesień (do 10. dnia - poprzedni miesiąc).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0));
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('Czas pracy - mało rzeczy na ekranie', () => {
    it('jedno zdanie podsumowania, bez pastylek etapów i bez akcji zbiorczych', async () => {
        serve(month({
            stage: 'REVIEWING',
            employees: [
                row('a', 'Anna Nowak'),
                row('b', 'Bogdan Lis', { status: 'NOT_STARTED', canDecide: false, remindedAt: '2026-09-30T08:00:00Z' }),
                row('c', 'Celina Bąk', { status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z' }),
            ],
        }));
        renderAt();
        expect(await screen.findByRole('heading', { name: '1 z 3 kart zatwierdzonych' })).toBeInTheDocument();
        for (const gone of ['Karty', 'Zatwierdzanie', 'Podpis listy', /Etap \d z 3/, /przypomniano/, /Nadgodziny/]) {
            expect(screen.queryByText(gone)).toBeNull();
        }
        for (const gone of [/Zatwierdź złożone/, /Przypomnij niezłożonym/, /Przejrzyj karty/, /Podpisz listę bez brakujących/]) {
            expect(screen.queryByRole('button', { name: gone })).toBeNull();
        }
        expect(screen.queryByText(/Wcześniejsze wersje/)).toBeNull();
        // Listy obecności są w osobnej zakładce.
        expect(screen.queryByText(/Lista obecności|Listę obecności/)).toBeNull();
        expect(screen.queryByRole('button', { name: /Podpisz listę/ })).toBeNull();
        // W tekście interfejsu nie ma kropki środkowej jako separatora (CLAUDE.md §4).
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('wiersz: nazwisko, godziny wobec normy z brakami, status tekstem - i otwiera okno karty', async () => {
        serve(month({
            stage: 'REVIEWING',
            employees: [
                row('a', 'Anna Nowak', { totalMinutes: 8250, expectedMinutes: 9120, missingWorkingDays: 2, overtimeMinutes: 90 }),
                row('b', 'Bogdan Lis', { status: 'NOT_STARTED', totalMinutes: 0, canDecide: false }),
                row('c', 'Celina Bąk', { status: 'DRAFT', canDecide: false, missingWorkingDays: 1 }),
                row('d', 'Dawid Kos', { status: 'RETURNED', canDecide: false }),
                row('e', 'Ewa Mak', { status: 'APPROVED' }),
            ],
        }));
        const router = renderAt();
        const rows = await screen.findAllByTestId('month-row');
        expect(rows).toHaveLength(5);
        expect(within(rows[0]).getByText('Anna Nowak')).toBeInTheDocument();
        expect(within(rows[0]).getByText('137:30 z 152 h, brak 2 dni')).toBeInTheDocument();
        expect(within(rows[2]).getByText(/brak 1 dnia/)).toBeInTheDocument();
        expect(within(rows[1]).getByText('0 z 168 h')).toBeInTheDocument();

        const statuses = rows.map(r => within(r).getByText(/Do zatwierdzenia|Brak wpisów|W trakcie|Zwrócona|Zatwierdzona/));
        expect(statuses.map(s => [s.textContent, s.getAttribute('data-tone')])).toEqual([
            ['Do zatwierdzenia', 'warn'],
            ['Brak wpisów', 'muted'],
            ['W trakcie', 'muted'],
            ['Zwrócona', 'danger'],
            ['Zatwierdzona', 'ok'],
        ]);
        // Żadnych przycisków wewnątrz wierszy - cały wiersz jest jednym przyciskiem.
        rows.forEach(r => expect(within(r).queryByRole('button')).toBeNull());

        api.getCard.mockResolvedValue(card('a', 'Anna Nowak'));
        fireEvent.click(rows[0]);
        // Okno nad listą, nie przejście na inną stronę - a karta jest w adresie.
        expect(await screen.findByRole('dialog', { name: 'Anna Nowak' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/employees/worktime');
        expect(new URLSearchParams(router.state.location.search).get('card')).toBe('a');
        expect(api.getCard).toHaveBeenCalledWith('2026-09', 'a');
    });

    it('zamknięcie okna zdejmuje kartę z adresu, a `?card` z linku otwiera okno od razu', async () => {
        serve(month({ stage: 'REVIEWING', employees: [ANNA] }));
        api.getCard.mockResolvedValue(card('anna', 'Anna Nowak'));
        const router = renderAt('/employees/worktime?period=2026-09&card=anna');
        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        fireEvent.click(within(dialog).getByRole('button', { name: /Zamknij/ }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(router.state.location.search).toBe('?period=2026-09');
    });

    it('nikt nie liczy czasu pracy: pusty stan', async () => {
        serve(month({ employees: [] }));
        renderAt();
        expect(await screen.findByText('W tym miesiącu nikt nie liczy czasu pracy')).toBeInTheDocument();
        expect(screen.queryByTestId('month-row')).toBeNull();
    });
});

describe('Czas pracy - miesiąc w adresie', () => {
    it('`?period` z powiadomienia otwiera wskazany miesiąc', async () => {
        serve(month({ period: '2026-08', label: 'Sierpień 2026', employees: [ANNA], stage: 'REVIEWING' }));
        renderAt('/employees/worktime?period=2026-08');
        expect(await screen.findByRole('combobox', { name: 'Wybierz miesiąc' })).toHaveValue('2026-08');
        await screen.findAllByTestId('month-row');
        expect(api.getMonth).toHaveBeenCalledWith('2026-08');
    });

    it('bez `?period` (albo z przyszłym) do 10. dnia otwiera poprzedni miesiąc', async () => {
        serve(month({ employees: [ANNA], stage: 'REVIEWING' }));
        renderAt('/employees/worktime?period=2027-01');
        await screen.findAllByTestId('month-row');
        expect(api.getMonth).toHaveBeenCalledWith('2026-09');
        expect(api.getMonth).not.toHaveBeenCalledWith('2027-01');
    });

    it('strzałki zmieniają miesiąc w adresie, a następnego po bieżącym nie ma', async () => {
        serve(month({ period: '2026-10', label: 'Październik 2026', employees: [ANNA], stage: 'REVIEWING' }));
        const router = renderAt('/employees/worktime?period=2026-10');
        await screen.findAllByTestId('month-row');
        expect(screen.getByRole('button', { name: 'Następny miesiąc' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Poprzedni miesiąc' }));
        expect(router.state.location.search).toBe('?period=2026-09');
    });
});
