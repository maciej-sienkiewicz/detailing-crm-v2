// @vitest-environment jsdom
//
// Czas pracy na telefonie: arkusz do wpisania godzin ma sięgać dolnej krawędzi
// ekranu (pod „Anuluj / Zapisz" prześwitywała strona), stać nad klawiaturą,
// a cały widok ma mieć wyłącznie jasny wygląd, niezależnie od trybu telefonu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { workTimeApi } from '../api/workTimeApi';
import type { PeriodDetail } from '../types';
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

const detail = (): PeriodDetail => ({
    period: '2026-09',
    label: 'Wrzesień 2026',
    status: 'DRAFT',
    totalMinutes: 0,
    totalHours: '0:00',
    entryCount: 0,
    returnNote: null,
    entries: [],
});

class FakeVisualViewport extends EventTarget {
    height = 800;
    offsetTop = 0;
}

const renderView = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <MemoryRouter>
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
    vi.mocked(workTimeApi.getPeriod).mockResolvedValue(detail());
});

afterEach(() => {
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
