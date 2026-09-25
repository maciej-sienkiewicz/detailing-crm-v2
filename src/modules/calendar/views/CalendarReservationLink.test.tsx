// @vitest-environment jsdom
//
// Powiadomienie push otwiera zwykły adres, a kalendarz bierze cel z location.state.
// Ta trasa jest tłumaczem - bez niej dotknięcie „Nowa rezerwacja" lądowało na dzisiejszym
// widoku kalendarza, a rezerwacji trzeba było szukać ręcznie.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CalendarReservationLink } from './CalendarReservationLink';

function CalendarProbe() {
    const location = useLocation();
    return <pre data-testid="state">{JSON.stringify(location.state)}</pre>;
}

describe('CalendarReservationLink', () => {
    it('przekazuje kalendarzowi rezerwację do podświetlenia i miesiąc do skoku', () => {
        render(
            <MemoryRouter initialEntries={['/calendar/rezerwacja/a-1?start=2026-10-01T08:00:00Z']}>
                <Routes>
                    <Route path="/calendar" element={<CalendarProbe />} />
                    <Route path="/calendar/rezerwacja/:appointmentId" element={<CalendarReservationLink />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(JSON.parse(screen.getByTestId('state').textContent ?? 'null')).toEqual({
            highlightEventId: 'a-1',
            highlightDate: '2026-10-01T08:00:00Z',
            openEventPopover: true,
        });
    });
});
