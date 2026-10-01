// @vitest-environment jsdom
//
// Listy miesięczne: jeden przepływ na miesiąc - karty zbierane → zatwierdzane → lista
// podpisana. Menedżer ma widzieć jednym spojrzeniem, kto złożył, kto nie i co czeka na
// niego; jedyny wypełniony przycisk to krok następny etapu (CLAUDE.md §2), a przegląd
// kart jest seryjny - po decyzji okno samo przechodzi do następnej złożonej karty.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import {
    worktimeMonthsApi, type CardDetail, type MonthCardRow, type MonthOverview, type MonthSheet,
} from '../../api/worktimeMonthsApi';
import { attendanceApi } from '../../api/attendanceApi';
import { filledIn } from '../leave/leaveTestHelpers';
import { MonthView } from './MonthView';

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { userId: 'me', permissions: null } }) }));

vi.mock('../../api/worktimeMonthsApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/worktimeMonthsApi')>()),
    worktimeMonthsApi: {
        getMonth: vi.fn(),
        getCard: vi.fn(),
        approveCard: vi.fn(),
        returnCard: vi.fn(),
        approveMany: vi.fn(),
        remind: vi.fn(),
        createSheet: vi.fn(),
        pendingCount: vi.fn(),
    },
}));
vi.mock('../../api/attendanceApi', async importOriginal => ({
    ...(await importOriginal<typeof import('../../api/attendanceApi')>()),
    attendanceApi: {
        getSigningOptions: vi.fn().mockResolvedValue({ tablets: [], phone: null }),
        getLatestRemoteSignature: vi.fn().mockResolvedValue(null),
        downloadAttendanceSheet: vi.fn(),
        approveAttendanceSheet: vi.fn(),
    },
}));
vi.mock('@/modules/checkin/hooks/useSignatureRequestsSocket', () => ({ useSignatureRequestsSocket: () => undefined }));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true, lockReason: null, isLoading: false }) }));
// Kanwa nie działa w jsdom.
vi.mock('@/common/components/SignaturePad', () => ({
    SignaturePad: forwardRef(function FakePad(_props, ref) {
        useImperativeHandle(ref, () => ({ clear: () => undefined, toDataUrl: () => null }));
        return <p>atrapa: pole podpisu</p>;
    }),
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

const signedSheet = (overrides: Partial<MonthSheet> = {}): MonthSheet => ({
    id: 'sheet-1',
    status: 'APPROVED',
    outdated: false,
    generatedAt: '2026-10-01T08:00:00Z',
    approvedAt: '2026-10-01T08:05:00Z',
    approvedByName: 'Maciej Sienkiewicz',
    excludedNames: [],
    ...overrides,
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

const cardOf = (r: MonthCardRow): CardDetail => ({
    ...r,
    period: '2026-09',
    label: 'Wrzesień 2026',
    returnedAt: null,
    returnedByName: null,
    days: [
        { date: '2026-09-01', minutes: 480, note: null, isWorkingDay: true, holidayName: null, leave: null, missing: false },
        { date: '2026-09-02', minutes: null, note: null, isWorkingDay: true, holidayName: null, leave: { type: 'SICK', label: 'L4' }, missing: false },
        { date: '2026-09-03', minutes: null, note: null, isWorkingDay: true, holidayName: null, leave: null, missing: true },
    ],
});

/** getMonth i getCard czytają z tej samej listy osób - jak backend. */
const serve = (overview: MonthOverview) => {
    api.getMonth.mockResolvedValue(overview);
    api.getCard.mockImplementation(async (_period, userId) => cardOf(overview.employees.find(r => r.userId === userId)!));
};

const renderAt = (path = '/employees/worktime?period=2026-09') => {
    const router = createMemoryRouter([{ path: '/employees/worktime', element: <MonthView /> }], { initialEntries: [path] });
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
const JAN = row('jan', 'Jan Kowalski');

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

describe('Listy miesięczne - krok następny zależy od etapu', () => {
    it('zbieranie kart: nic nie jest wypełnione, jest przypomnienie niezłożonym', async () => {
        serve(month({
            stage: 'COLLECTING',
            employees: [
                row('a', 'Anna Nowak', { status: 'NOT_STARTED', canDecide: false }),
                row('b', 'Bogdan Lis', { status: 'RETURNED', canDecide: false }),
                row('c', 'Celina Bąk', { status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z' }),
            ],
        }));
        renderAt();
        expect(await screen.findByText('1 z 3')).toBeInTheDocument();
        expect(filledIn(document.body)).toHaveLength(0);
        expect(screen.getByRole('button', { name: /Przypomnij niezłożonym \(2\)/ })).toBeEnabled();
    });

    it('przegląd: jedyne wypełnienie to „Przejrzyj karty", otwiera pierwszą złożoną', async () => {
        serve(month({ stage: 'REVIEWING', employees: [row('x', 'Xenia Wróbel', { status: 'DRAFT', canDecide: false }), ANNA, JAN] }));
        const router = renderAt();
        const next = await screen.findByRole('button', { name: /Przejrzyj karty \(2\)/ });
        expect(filledIn(document.body)).toHaveLength(1);
        expect(filledIn(document.body)[0]).toBe(next);

        fireEvent.click(next);
        expect(router.state.location.search).toContain('card=anna');
        expect(await screen.findByRole('heading', { name: 'Anna Nowak' })).toBeInTheDocument();
    });

    it('wszystkie zatwierdzone: krok następny to podpis listy za miesiąc', async () => {
        serve(month({ stage: 'READY_TO_SIGN', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })] }));
        renderAt();
        const sign = await screen.findByRole('button', { name: /Podpisz listę obecności za wrzesień 2026/ });
        expect(Array.from(filledIn(document.body))).toEqual([sign]);
    });

    it('lista nieaktualna po odblokowaniu karty: „Podpisz listę ponownie"', async () => {
        serve(month({
            stage: 'NEEDS_RESIGN',
            employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })],
            sheet: signedSheet({ outdated: true }),
        }));
        renderAt();
        const sign = await screen.findByRole('button', { name: /Podpisz listę ponownie/ });
        expect(Array.from(filledIn(document.body))).toEqual([sign]);
        expect(screen.getByText('Nieaktualna')).toBeInTheDocument();
    });

    it('lista podpisana: nic wypełnionego, pobranie PDF jako obwódka', async () => {
        serve(month({ stage: 'SIGNED', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })], sheet: signedSheet() }));
        renderAt();
        const download = await screen.findByRole('button', { name: /Pobierz podpisaną listę/ });
        expect(download.getAttribute('data-variant')).toBe('outline');
        expect(filledIn(document.body)).toHaveLength(0);
    });
});

describe('Listy miesięczne - wiersze', () => {
    it('każda osoba: status, godziny wobec normy, braki, nadgodziny, przypomnienie', async () => {
        serve(month({
            stage: 'REVIEWING',
            employees: [
                row('a', 'Anna Nowak', { missingWorkingDays: 2, overtimeMinutes: 360 }),
                row('b', 'Bogdan Lis', { status: 'NOT_STARTED', totalMinutes: 0, canDecide: false, remindedAt: '2026-09-30T08:00:00Z' }),
                row('c', 'Celina Bąk', { status: 'DRAFT', canDecide: false }),
                row('d', 'Dawid Kos', { status: 'RETURNED', canDecide: false }),
                row('e', 'Ewa Mak', { status: 'APPROVED' }),
            ],
        }));
        renderAt();
        const rows = await screen.findAllByTestId('month-row');
        expect(rows.map(r => r.getAttribute('aria-label'))).toEqual([
            'Otwórz kartę: Anna Nowak, Do zatwierdzenia',
            'Otwórz kartę: Bogdan Lis, Brak wpisów',
            'Otwórz kartę: Celina Bąk, W trakcie',
            'Otwórz kartę: Dawid Kos, Zwrócona',
            'Otwórz kartę: Ewa Mak, Zatwierdzona',
        ]);
        expect(within(rows[0]).getByText('152 / 168 h')).toBeInTheDocument();
        expect(within(rows[0]).getByText('brak 2 dni')).toBeInTheDocument();
        expect(within(rows[0]).getByText(/\+6 h/)).toBeInTheDocument();
        expect(within(rows[1]).getByText('przypomniano 30.09')).toBeInTheDocument();
        // W tekście interfejsu nie ma kropki środkowej jako separatora (CLAUDE.md §4).
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('zatwierdzenie zbiorcze bierze tylko złożone bez braków i pyta z nazwiskami', async () => {
        serve(month({ stage: 'REVIEWING', employees: [ANNA, row('b', 'Bogdan Lis', { missingWorkingDays: 1 }), JAN] }));
        api.approveMany.mockResolvedValue({ approved: ['anna', 'jan'], skipped: [] });
        renderAt();
        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź złożone bez braków \(2\)/ }));
        expect(screen.getByText(/Anna Nowak, Jan Kowalski\./)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Zatwierdź' }));
        await waitFor(() => expect(api.approveMany).toHaveBeenCalledWith('2026-09', ['anna', 'jan']));
    });
});

describe('Listy miesięczne - okno przeglądu karty', () => {
    it('po zatwierdzeniu okno przechodzi do następnej złożonej karty, a po ostatniej mówi, co dalej', async () => {
        serve(month({ stage: 'REVIEWING', employees: [ANNA, row('b', 'Bogdan Lis', { status: 'APPROVED' }), JAN] }));
        api.approveCard.mockImplementation(async userId => ({ ...(userId === 'anna' ? ANNA : JAN), status: 'APPROVED' }));
        const router = renderAt('/employees/worktime?period=2026-09&card=anna');

        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        await within(dialog).findByText('L4');
        expect(within(dialog).getByText('brak wpisu')).toBeInTheDocument();
        expect(filledIn(dialog)).toHaveLength(1);

        fireEvent.click(within(dialog).getByRole('button', { name: /Zatwierdź kartę/ }));
        await waitFor(() => expect(api.approveCard).toHaveBeenCalledWith('anna', '2026-09'));
        const nextDialog = await screen.findByRole('dialog', { name: 'Jan Kowalski' });
        expect(router.state.location.search).toContain('card=jan');
        expect(within(nextDialog).getByRole('status')).toHaveTextContent('Zatwierdzono kartę: Anna Nowak. Następna: Jan Kowalski, 2 z 2.');

        fireEvent.click(await screen.findByRole('button', { name: /Zatwierdź kartę/ }));
        expect(await screen.findByRole('dialog', { name: 'Przegląd zakończony' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Wszystkie karty zatwierdzone — podpisz listę/ })).toBeInTheDocument();
    });

    it('zwrot do poprawy wymaga notatki', async () => {
        serve(month({ stage: 'REVIEWING', employees: [ANNA] }));
        api.returnCard.mockResolvedValue({ ...ANNA, status: 'RETURNED' });
        renderAt('/employees/worktime?period=2026-09&card=anna');

        fireEvent.click(await screen.findByRole('button', { name: /Zwróć do poprawy/ }));
        const dialog = screen.getByRole('dialog', { name: 'Anna Nowak' });
        // Edytor przejmuje stopkę: „Zatwierdź kartę" znika, wypełnione jest tylko „Zwróć kartę".
        expect(within(dialog).queryByRole('button', { name: /Zatwierdź kartę/ })).toBeNull();
        expect(filledIn(dialog)).toHaveLength(1);

        fireEvent.click(within(dialog).getByRole('button', { name: 'Zwróć kartę' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('Napisz, co trzeba poprawić');
        expect(api.returnCard).not.toHaveBeenCalled();

        fireEvent.change(within(dialog).getByLabelText('Co trzeba poprawić?'), { target: { value: '  Brakuje 15 i 16 września ' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Zwróć kartę' }));
        await waitFor(() => expect(api.returnCard).toHaveBeenCalledWith('anna', '2026-09', 'Brakuje 15 i 16 września'));
    });

    it('odblokowanie karty z podpisanej listy ostrzega, że listę trzeba podpisać ponownie', async () => {
        const approved = row('anna', 'Anna Nowak', { status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z', approvedByName: 'Maciej' });
        serve(month({ stage: 'SIGNED', employees: [approved], sheet: signedSheet() }));
        renderAt('/employees/worktime?period=2026-09&card=anna');

        const dialog = await screen.findByRole('dialog', { name: 'Anna Nowak' });
        // Zatwierdzona karta nie ma kroku następnego - „Odblokuj" jest obwódką.
        const unlock = await within(dialog).findByRole('button', { name: /Odblokuj kartę/ });
        expect(filledIn(dialog)).toHaveLength(0);
        fireEvent.click(unlock);
        expect(within(dialog).getByText(/jest już podpisana i obejmuje tę kartę/)).toBeInTheDocument();
        expect(within(dialog).getByText(/trzeba będzie podpisać ją ponownie/)).toBeInTheDocument();
    });

    it('własnej karty nie zatwierdzasz', async () => {
        serve(month({ stage: 'REVIEWING', employees: [row('me', 'Maciej Sienkiewicz', { canDecide: false })] }));
        renderAt('/employees/worktime?period=2026-09&card=me');
        const dialog = await screen.findByRole('dialog', { name: 'Maciej Sienkiewicz' });
        expect(await within(dialog).findByText('Własnej karty nie zatwierdzasz')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: /Zatwierdź kartę/ })).toBeNull();
    });

    it('przypomnienie jest wygaszone z powodem, gdy poszło mniej niż 12 h temu', async () => {
        serve(month({
            stage: 'COLLECTING',
            employees: [row('b', 'Bogdan Lis', { status: 'DRAFT', canDecide: false, remindedAt: '2026-10-01T08:00:00Z' })],
        }));
        renderAt('/employees/worktime?period=2026-09&card=b');
        const dialog = await screen.findByRole('dialog', { name: 'Bogdan Lis' });
        expect(await within(dialog).findByRole('button', { name: /Przypomnij/ })).toBeDisabled();
        expect(within(dialog).getByText(/Kolejne przypomnienie można wysłać po 12 godzinach/)).toBeInTheDocument();
    });
});

describe('Listy miesięczne - podpis listy', () => {
    it('409 z nazwiskami pyta „Podpisać bez…?" i ponawia z allowIncomplete', async () => {
        serve(month({ stage: 'READY_TO_SIGN', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })] }));
        api.createSheet
            .mockRejectedValueOnce({ response: { status: 409, data: { message: 'Niezatwierdzone karty', field: null, names: ['Jan Nowak', 'Ola Lis'] } } })
            .mockResolvedValueOnce({
                id: 'sheet-new', status: 'GENERATED', outdated: false, generatedAt: '2026-10-01T09:00:00Z',
                approvedAt: null, approvedByName: null, excludedNames: ['Jan Nowak', 'Ola Lis'],
            });
        renderAt();

        fireEvent.click(await screen.findByRole('button', { name: /Podpisz listę obecności za wrzesień 2026/ }));
        await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('2026-09', false));
        expect(await screen.findByText(/Podpisać bez: Jan Nowak, Ola Lis\?/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Podpisz bez nich' }));
        await waitFor(() => expect(api.createSheet).toHaveBeenLastCalledWith('2026-09', true));
        expect(await screen.findByText('Zatwierdzić listę obecności?')).toBeInTheDocument();
        expect(vi.mocked(attendanceApi.getLatestRemoteSignature)).toHaveBeenCalledWith('sheet-new');
    });

    it('niepodpisana, aktualna lista jest podpisywana bez tworzenia nowej', async () => {
        serve(month({
            stage: 'READY_TO_SIGN',
            employees: [row('a', 'Anna Nowak', { status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z' })],
            sheet: signedSheet({ status: 'GENERATED', approvedAt: null, approvedByName: null }),
        }));
        renderAt();
        fireEvent.click(await screen.findByRole('button', { name: /Podpisz listę obecności/ }));
        expect(await screen.findByText('Zatwierdzić listę obecności?')).toBeInTheDocument();
        expect(api.createSheet).not.toHaveBeenCalled();
    });
});

describe('Listy miesięczne - miesiąc w adresie', () => {
    it('`?period` z powiadomienia otwiera wskazany miesiąc', async () => {
        serve(month({ period: '2026-08', label: 'Sierpień 2026', employees: [ANNA], stage: 'REVIEWING' }));
        renderAt('/employees/worktime?period=2026-08');
        await screen.findByText(/Sierpień 2026, 21 dni roboczych/);
        expect(api.getMonth).toHaveBeenCalledWith('2026-08');
    });

    it('bez `?period` (albo z przyszłym) do 10. dnia otwiera poprzedni miesiąc', async () => {
        serve(month({ employees: [ANNA], stage: 'REVIEWING' }));
        renderAt('/employees/worktime?period=2027-01');
        await screen.findByText(/Wrzesień 2026, 21 dni roboczych/);
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
