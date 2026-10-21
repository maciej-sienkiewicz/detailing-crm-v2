// @vitest-environment jsdom
//
// Wyszukiwarka kalendarza pyta serwer o frazę (po pauzie w pisaniu), zamiast przy każdym
// otwarciu pobierać kalendarz z czterech lat i filtrować go w przeglądarce.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({ searchCalendarEvents: vi.fn(), getCalendarEvents: vi.fn() }));
vi.mock('../api/calendarApi', () => ({ calendarApi: api, CALENDAR_SEARCH_LIMIT: 50 }));

import { CalendarSearchModal } from './CalendarSearchModal';

// jsdom nie ma matchMedia; okno pyta o nią przez useBreakpoint (arkusz na telefonie).
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CalendarSearchModal', () => {
    it('szuka na serwerze po frazie, bez pobierania całego kalendarza', async () => {
        api.searchCalendarEvents.mockResolvedValue([{
            id: 'a1', title: 'Ceramika', start: '2026-10-22T08:00:00Z',
            extendedProps: { type: 'APPOINTMENT', customerName: 'Jan Kowalski', vehicleInfo: 'BMW X5', status: 'CREATED' },
        }]);
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={theme}>
                    <CalendarSearchModal onClose={vi.fn()} onSelectEvent={vi.fn()} />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        await userEvent.type(screen.getByPlaceholderText('Klient, auto, tablica albo tytuł'), 'Kowalski BMW');

        expect(await screen.findByText('1 wynik')).toBeTruthy();
        await waitFor(() => expect(api.searchCalendarEvents).toHaveBeenLastCalledWith('Kowalski BMW', expect.any(AbortSignal)));
        // Po pauzie w pisaniu - nie po każdym znaku.
        expect(api.searchCalendarEvents.mock.calls.length).toBeLessThanOrEqual(2);
        expect(api.getCalendarEvents).not.toHaveBeenCalled();
    });
});
