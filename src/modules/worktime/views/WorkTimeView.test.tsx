// @vitest-environment jsdom
//
// Czas pracy na telefonie: arkusz do wpisania godzin ma sięgać dolnej krawędzi
// ekranu (pod „Anuluj / Zapisz" prześwitywała strona), stać nad klawiaturą,
// a cały widok ma mieć wyłącznie jasny wygląd, niezależnie od trybu telefonu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { workTimeApi } from '../api/workTimeApi';
import type { CardDay, PeriodDetail } from '../types';
import { WorkTimeView } from './WorkTimeView';

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { trackWorkTime: true } }),
}));

vi.mock('../api/workTimeApi', () => ({
    workTimeApi: {
        getPeriod: vi.fn(),
        upsertEntry: vi.fn(),
        deleteEntry: vi.fn(),
        fillMonth: vi.fn(),
        standardToday: vi.fn(),
        submitPeriod: vi.fn(),
        listPeriods: vi.fn(),
    },
}));

// Zamknięcie arkusza przywraca pozycję przewinięcia - jsdom nie ma scrollTo.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const detail = (overrides: Partial<PeriodDetail> = {}): PeriodDetail => ({
    period: '2026-09',
    label: 'Wrzesień 2026',
    status: 'DRAFT',
    totalMinutes: 0,
    totalHours: '0:00',
    entryCount: 0,
    returnNote: null,
    entries: [],
    ...overrides,
});

const day = (date: string, overrides: Partial<CardDay> = {}): CardDay => ({
    date, minutes: null, note: null, isWorkingDay: true, holidayName: null, leave: null, missing: false, ...overrides,
});

class FakeVisualViewport extends EventTarget {
    height = 800;
    offsetTop = 0;
}

const renderView = (path = '/worktime') => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <MemoryRouter initialEntries={[path]}>
                        <WorkTimeView />
                    </MemoryRouter>
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

/** Otwiera arkusz pierwszego dnia miesiąca i zwraca go. */
const openFirstDay = async () => {
    const [firstDay] = await screen.findAllByLabelText(/brak wpisu/);
    fireEvent.click(firstDay);
    return screen.getByRole('dialog');
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail());
    vi.mocked(workTimeApi.listPeriods).mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('WorkTimeView - arkusz godzin na telefonie', () => {
    it('arkusz to osobna warstwa obok nakładki, nie jej dziecko - zamyka go dopiero tło', async () => {
        renderView();
        const sheet = await openFirstDay();

        expect(screen.getByLabelText(/Czas pracy \(np\. 8/)).toBe(document.activeElement);

        const backdrop = sheet.previousElementSibling as HTMLElement;
        expect(backdrop.contains(sheet)).toBe(false);

        fireEvent.click(sheet);
        expect(screen.queryByRole('dialog')).not.toBeNull();

        fireEvent.click(backdrop);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('przy wysuniętej klawiaturze arkusz z przyciskami stoi nad nią', async () => {
        const vv = new FakeVisualViewport();
        vv.height = 480;
        vi.stubGlobal('visualViewport', vv);
        vi.stubGlobal('innerHeight', 800);

        renderView();
        const sheet = await openFirstDay();

        expect(sheet.style.bottom).toBe('320px');
        expect(sheet.style.top).toBe('');
    });

    it('widok nie ma ciemnego wariantu i zabrania przeglądarce go przyciemniać', async () => {
        renderView();
        await openFirstDay();

        const css = Array.from(document.querySelectorAll('style'))
            .map(style => style.textContent ?? '')
            .join('\n');
        expect(css).not.toContain('prefers-color-scheme');
        expect(css).toMatch(/color-scheme:\s*only light/);
    });
});

describe('WorkTimeView - karta złożona, zwrócona i braki', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 20, 12, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('złożona karta jest tylko do odczytu: baner, bez szybkich akcji, edycji i złożenia', async () => {
        vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail({
            status: 'SUBMITTED',
            entryCount: 1,
            entries: [{ date: '2026-09-01', minutes: 480, hours: '8:00', note: null }],
        }));
        renderView();
        expect(await screen.findByText('Karta złożona, czeka na decyzję przełożonego.')).toBeInTheDocument();
        expect(screen.getByText('Jeśli trzeba coś poprawić, poproś o zwrot.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Uzupełnij miesiąc/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Standardowa dniówka/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Złóż kartę/ })).toBeNull();

        fireEvent.click(screen.getAllByLabelText(/brak wpisu/)[0]);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('zwrócona karta pokazuje notatkę przełożonego', async () => {
        vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail({ status: 'RETURNED', returnNote: 'Brakuje 15 września' }));
        renderView();
        expect(await screen.findByText('Karta zwrócona do poprawy')).toBeInTheDocument();
        expect(screen.getByText('Brakuje 15 września')).toBeInTheDocument();
    });

    it('zwrócona karta z innego miesiąca: baner z przejściem do niej', async () => {
        vi.mocked(workTimeApi.listPeriods).mockResolvedValue([{
            period: '2026-08', label: 'Sierpień 2026', status: 'RETURNED', totalMinutes: 0, totalHours: '0:00',
            entryCount: 3, returnNote: 'Dopisz nadgodziny',
        }]);
        renderView();
        const banner = (await screen.findByText('Masz zwróconą kartę za sierpień 2026')).closest('div')!.parentElement!;
        fireEvent.click(within(banner).getByRole('button', { name: 'Otwórz kartę' }));
        await waitFor(() => expect(workTimeApi.getPeriod).toHaveBeenCalledWith('2026-08'));
    });

    it('dni z serwera: święto i urlop/L4 podpisane, brakujący dzień roboczy oznaczony', async () => {
        vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail({
            missingWorkingDays: 1,
            days: [
                day('2026-09-01', { missing: true }),
                day('2026-09-02', { leave: { type: 'SICK', label: 'L4' } }),
                day('2026-09-03', { isWorkingDay: false, holidayName: 'Święto testowe' }),
            ],
        }));
        renderView();
        expect(await screen.findByText('L4')).toBeInTheDocument();
        expect(screen.getByText('Święto testowe')).toBeInTheDocument();
        expect(screen.getByLabelText(/Wtorek 01\.09: brak wpisu/)).toHaveTextContent('brak wpisu');
        expect(screen.getByText(/Brak wpisu w 1 dniu roboczym/)).toBeInTheDocument();
    });

    it('złożenie karty z brakami najpierw pyta, ile dni brakuje', async () => {
        vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail({
            entryCount: 18,
            missingWorkingDays: 2,
            entries: [{ date: '2026-09-01', minutes: 480, hours: '8:00', note: null }],
        }));
        vi.mocked(workTimeApi.submitPeriod).mockResolvedValue(detail({ status: 'SUBMITTED' }));
        renderView();
        fireEvent.click(await screen.findByRole('button', { name: 'Złóż kartę do zatwierdzenia' }));
        expect(screen.getByText(/brakuje wpisu w 2 dniach roboczych/)).toBeInTheDocument();
        expect(workTimeApi.submitPeriod).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Złóż mimo braków' }));
        await waitFor(() => expect(workTimeApi.submitPeriod).toHaveBeenCalled());
    });

    it('„Uzupełnij miesiąc" mówi, że pomija święta i urlop', async () => {
        renderView();
        fireEvent.click(await screen.findByRole('button', { name: /Uzupełnij miesiąc/ }));
        expect(screen.getByText(/Święta oraz dni urlopu i L4 zostaną pominięte/)).toBeInTheDocument();
    });

    it('`?period` z powiadomienia otwiera wskazany miesiąc, przyszły - bieżący', async () => {
        renderView('/worktime?period=2026-07');
        await waitFor(() => expect(workTimeApi.getPeriod).toHaveBeenCalledWith('2026-07'));
        expect(screen.getByText('Lipiec 2026')).toBeInTheDocument();
        cleanup();
        vi.mocked(workTimeApi.getPeriod).mockClear();
        renderView('/worktime?period=2027-01');
        await waitFor(() => expect(workTimeApi.getPeriod).toHaveBeenCalledWith('2026-09'));
    });
});
