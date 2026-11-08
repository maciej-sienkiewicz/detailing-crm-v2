// @vitest-environment jsdom
//
// Odtworzenie zgłoszenia: link do rezerwacji (powiadomienie push) wpadał w pętlę
// „Maximum update depth exceeded", gdy moduł kalendarza ładował się wolno. Trasa
// kalendarza jest leniwa, więc przez cały czas ładowania adres stoi w miejscu, a każda
// zmiana stanu nawigacji renderuje link od nowa - z nowym obiektem `state` <Navigate>
// nawigował przy każdym renderze i sam podtrzymywał pętlę.
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { CalendarReservationLink } from './CalendarReservationLink';

function CalendarProbe() {
    const location = useLocation();
    return <pre data-testid="state">{JSON.stringify(location.state)}</pre>;
}

describe('CalendarReservationLink przy wolno ładowanym kalendarzu', () => {
    it('nawiguje raz i przekazuje stan, zamiast restartować nawigację w kółko', async () => {
        let loadCalendar!: () => void;
        const calendarModule = new Promise<void>(resolve => { loadCalendar = resolve; });

        const router = createMemoryRouter([
            { path: '/calendar', lazy: async () => { await calendarModule; return { Component: CalendarProbe }; } },
            { path: '/calendar/appointments/:appointmentId', element: <CalendarReservationLink /> },
        ], { initialEntries: ['/calendar/appointments/a-1?start=2026-10-01T08:00:00Z'] });

        // <Navigate> woła router.navigate. Licznik z bezpiecznikiem: bez niego błędny kod
        // kręci się bez końca i zabija proces testów, zamiast dać czytelną porażkę.
        let navigations = 0;
        const navigate = router.navigate.bind(router);
        router.navigate = ((...args: Parameters<typeof navigate>) =>
            ++navigations > 10 ? Promise.resolve() : navigate(...args)) as typeof router.navigate;

        render(<RouterProvider router={router} />);
        await act(() => new Promise(resolve => setTimeout(resolve, 50)));

        expect(navigations).toBe(1);

        await act(async () => { loadCalendar(); await calendarModule; });

        expect(JSON.parse((await screen.findByTestId('state')).textContent ?? 'null')).toEqual({
            highlightEventId: 'a-1',
            highlightDate: '2026-10-01T08:00:00Z',
            openEventPopover: true,
        });
    });
});
