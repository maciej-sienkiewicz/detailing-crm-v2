// @vitest-environment jsdom
//
// Listy miesięczne po uproszczeniu (uwagi właściciela: „za dużo labelek, za dużo
// przycisków, wiele ścieżek do tego samego modalu, badge tylko informacyjne"): jedno
// zdanie podsumowania, lista osób, w której wiersz jest jedynym linkiem do strony karty,
// i na dole jedno zdanie o liście obecności z najwyżej jedną akcją.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import {
    worktimeMonthsApi, type MonthCardRow, type MonthOverview, type MonthSheet,
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

const serve = (overview: MonthOverview) => {
    api.getMonth.mockResolvedValue(overview);
};

const renderAt = (path = '/employees/worktime?period=2026-09') => {
    const router = createMemoryRouter([
        { path: '/employees/worktime', element: <MonthView /> },
        { path: '/employees/worktime/:period/:userId', element: <p>strona karty</p> },
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

describe('Listy miesięczne - mało rzeczy na ekranie', () => {
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
        // W tekście interfejsu nie ma kropki środkowej jako separatora (CLAUDE.md §4).
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('wiersz: nazwisko, godziny wobec normy z brakami, status tekstem - i jest linkiem do strony karty', async () => {
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
        expect(rows.map(r => r.tagName)).toEqual(['A', 'A', 'A', 'A', 'A']);
        expect(rows.map(r => r.getAttribute('href'))).toEqual([
            '/employees/worktime/2026-09/a',
            '/employees/worktime/2026-09/b',
            '/employees/worktime/2026-09/c',
            '/employees/worktime/2026-09/d',
            '/employees/worktime/2026-09/e',
        ]);
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
        // Żadnych przycisków w wierszach.
        rows.forEach(r => expect(within(r).queryByRole('button')).toBeNull());

        fireEvent.click(rows[0]);
        expect(router.state.location.pathname).toBe('/employees/worktime/2026-09/a');
    });

    it('nikt nie liczy czasu pracy: pusty stan', async () => {
        serve(month({ employees: [] }));
        renderAt();
        expect(await screen.findByText('W tym miesiącu nikt nie liczy czasu pracy')).toBeInTheDocument();
        expect(screen.queryByTestId('month-row')).toBeNull();
    });
});

describe('Listy miesięczne - lista obecności', () => {
    it('podpisana i aktualna: jedno zdanie i link „Pobierz PDF", nic wypełnionego', async () => {
        serve(month({ stage: 'SIGNED', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })], sheet: signedSheet() }));
        renderAt();
        expect(await screen.findByText(/Lista obecności podpisana 01\.10\.2026, Maciej Sienkiewicz\./)).toBeInTheDocument();
        const download = screen.getByRole('button', { name: 'Pobierz PDF' });
        expect(filledIn(document.body)).toHaveLength(0);

        vi.mocked(attendanceApi.downloadAttendanceSheet).mockResolvedValue(new Blob(['%PDF']));
        URL.createObjectURL = vi.fn(() => 'blob:x');
        URL.revokeObjectURL = vi.fn();
        // jsdom nie nawiguje - kliknięcie linku pobrania tylko by o tym ostrzegło.
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        fireEvent.click(download);
        await waitFor(() => expect(attendanceApi.downloadAttendanceSheet).toHaveBeenCalledWith('sheet-1'));
    });

    it('wszystkie zatwierdzone: jedyne wypełnienie w oknie to „Podpisz listę obecności"', async () => {
        serve(month({ stage: 'READY_TO_SIGN', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })] }));
        api.createSheet.mockResolvedValue({
            id: 'sheet-new', status: 'GENERATED', outdated: false, generatedAt: '2026-10-01T09:00:00Z',
            approvedAt: null, approvedByName: null, excludedNames: [],
        });
        renderAt();
        const sign = await screen.findByRole('button', { name: 'Podpisz listę obecności' });
        expect(Array.from(filledIn(document.body))).toEqual([sign]);

        fireEvent.click(sign);
        await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('2026-09', false));
        expect(await screen.findByText('Zatwierdzić listę obecności?')).toBeInTheDocument();
    });

    it('lista nieaktualna po zmianie karty: ten sam przycisk i zdanie o ponownym podpisie', async () => {
        serve(month({
            stage: 'NEEDS_RESIGN',
            employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })],
            sheet: signedSheet({ outdated: true }),
        }));
        renderAt();
        expect(await screen.findByText('Lista wymaga ponownego podpisu, bo zmieniła się karta.')).toBeInTheDocument();
        expect(Array.from(filledIn(document.body))).toEqual([screen.getByRole('button', { name: 'Podpisz listę obecności' })]);
    });

    it('część kart niezatwierdzona: jedno pytanie z nazwiskami, potem lista z allowIncomplete', async () => {
        serve(month({
            stage: 'REVIEWING',
            employees: [
                row('a', 'Anna Nowak', { status: 'APPROVED' }),
                row('j', 'Jan Kowalski'),
                row('o', 'Ola Lis', { status: 'DRAFT', canDecide: false }),
            ],
        }));
        api.createSheet.mockResolvedValue({
            id: 'sheet-new', status: 'GENERATED', outdated: false, generatedAt: '2026-10-01T09:00:00Z',
            approvedAt: null, approvedByName: null, excludedNames: ['Jan Kowalski', 'Ola Lis'],
        });
        renderAt();

        fireEvent.click(await screen.findByRole('button', { name: 'Podpisz listę obecności' }));
        expect(await screen.findByText('Na liście nie będzie: Jan Kowalski, Ola Lis (karty niezatwierdzone). Podpisać mimo to?')).toBeInTheDocument();
        expect(api.createSheet).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Podpisz mimo to' }));
        await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('2026-09', true));
        expect(await screen.findByText('Zatwierdzić listę obecności?')).toBeInTheDocument();
        expect(vi.mocked(attendanceApi.getLatestRemoteSignature)).toHaveBeenCalledWith('sheet-new');
    });

    it('409 z nazwiskami (ktoś zmienił kartę w międzyczasie) zadaje to samo pytanie', async () => {
        serve(month({ stage: 'READY_TO_SIGN', employees: [row('a', 'Anna Nowak', { status: 'APPROVED' })] }));
        api.createSheet
            .mockRejectedValueOnce({ response: { status: 409, data: { message: 'Niezatwierdzone karty', field: null, names: ['Jan Nowak'] } } })
            .mockResolvedValueOnce({
                id: 'sheet-new', status: 'GENERATED', outdated: false, generatedAt: '2026-10-01T09:00:00Z',
                approvedAt: null, approvedByName: null, excludedNames: ['Jan Nowak'],
            });
        renderAt();
        fireEvent.click(await screen.findByRole('button', { name: 'Podpisz listę obecności' }));
        expect(await screen.findByText(/Na liście nie będzie: Jan Nowak \(karty niezatwierdzone\)/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Podpisz mimo to' }));
        await waitFor(() => expect(api.createSheet).toHaveBeenLastCalledWith('2026-09', true));
    });

    it('niepodpisana, aktualna lista jest podpisywana bez tworzenia nowej', async () => {
        serve(month({
            stage: 'READY_TO_SIGN',
            employees: [row('a', 'Anna Nowak', { status: 'APPROVED', approvedAt: '2026-09-30T12:00:00Z' })],
            sheet: signedSheet({ status: 'GENERATED', approvedAt: null, approvedByName: null }),
        }));
        renderAt();
        fireEvent.click(await screen.findByRole('button', { name: 'Podpisz listę obecności' }));
        expect(await screen.findByText('Zatwierdzić listę obecności?')).toBeInTheDocument();
        expect(api.createSheet).not.toHaveBeenCalled();
    });

    it('żadna karta niezatwierdzona: tylko zdanie, bez przycisku', async () => {
        serve(month({ stage: 'REVIEWING', employees: [ANNA, JAN] }));
        renderAt();
        expect(await screen.findByText('Listę obecności podpiszesz, gdy zatwierdzisz pierwszą kartę.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Podpisz/ })).toBeNull();
        expect(filledIn(document.body)).toHaveLength(0);
    });
});

describe('Listy miesięczne - miesiąc w adresie', () => {
    it('`?period` z powiadomienia otwiera wskazany miesiąc', async () => {
        serve(month({ period: '2026-08', label: 'Sierpień 2026', employees: [ANNA], stage: 'REVIEWING' }));
        renderAt('/employees/worktime?period=2026-08');
        expect(await screen.findByRole('combobox', { name: 'Wybierz miesiąc' })).toHaveValue('2026-08');
        await screen.findAllByTestId('month-row');
        expect(api.getMonth).toHaveBeenCalledWith('2026-08');
        expect(screen.getByTestId('month-row').getAttribute('href')).toBe('/employees/worktime/2026-08/anna');
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
