// @vitest-environment jsdom
//
// Trzeci wskaźnik karty powitania: czerwień tylko przy czekających zapytaniach,
// zero to spokojne „wszystko obsłużone” (z kwotą wygranych w tygodniu, gdy jest).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { LeadsWaitingKpi } from './LeadsWaitingKpi';

const state = vi.hoisted(() => ({ waiting: 0, won: 0 }));
vi.mock('@/modules/comms/hooks/useLeads', () => ({
    useNewLeadsCount: () => state.waiting,
    useLeadOverview: () => ({ data: { confirmedValueThisWeek: state.won } }),
}));

afterEach(() => cleanup());

const renderKpi = (autoLeadsOff = false) => {
    const router = createMemoryRouter([
        { path: '/dashboard', element: <LeadsWaitingKpi autoLeadsOff={autoLeadsOff} /> },
        { path: '/inbox', element: <p>skrzynka zapytań</p> },
    ], { initialEntries: ['/dashboard'] });
    render(<ThemeProvider theme={theme}><RouterProvider router={router} /></ThemeProvider>);
    return router;
};

describe('LeadsWaitingKpi', () => {
    it('czekające zapytania: etykieta alarmu, liczba i „Odpisz” prowadzi do skrzynki', () => {
        state.waiting = 7; state.won = 0;
        const router = renderKpi();
        expect(screen.getByText('Zapytania czekają na odpowiedź')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Odpisz →' }));
        expect(router.state.location.pathname).toBe('/inbox');
    });

    it('nic nie czeka: spokojne „Wszystko obsłużone”, bez przycisku', () => {
        state.waiting = 0; state.won = 0;
        renderKpi();
        expect(screen.getByText('Zapytania')).toBeInTheDocument();
        expect(screen.getByText('Wszystko obsłużone')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('nic nie czeka, ale zapytania przyniosły rezerwacje: kwota z tego tygodnia', () => {
        state.waiting = 0; state.won = 450_000;
        renderKpi();
        expect(screen.getByText('Wszystko obsłużone')).toBeInTheDocument();
        expect(screen.getByText(/W tym tygodniu z zapytań 4\s?500,00\s?zł/)).toBeInTheDocument();
    });

    it('poczta bez tworzenia zapytań i nic nie czeka: zachęta zamiast „Wszystko obsłużone”', () => {
        state.waiting = 0; state.won = 0;
        renderKpi(true);
        expect(screen.getByText('Zarządzaj zapytaniami')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sprawdź, jak to działa →' })).toBeInTheDocument();
        expect(screen.queryByText('Wszystko obsłużone')).not.toBeInTheDocument();
    });

    it('poczta bez tworzenia zapytań, ale coś czeka (formularz): licznik zostaje', () => {
        state.waiting = 2; state.won = 0;
        renderKpi(true);
        expect(screen.getByText('Zapytania czekają na odpowiedź')).toBeInTheDocument();
        expect(screen.queryByText('Zarządzaj zapytaniami')).not.toBeInTheDocument();
    });
});
