// @vitest-environment jsdom
//
// Zgłoszenie: gdy nie wczytała się lista kolorów wizyt, przyjęcia nie dało się zacząć,
// a ekran mówił „Nie znaleziono rezerwacji" (albo angielski error.message) i nie miał ani
// ponowienia, ani powrotu. Walk-in startował z pustą listą i żądał koloru, którego nie
// dało się wybrać.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({
    getAppointment: vi.fn(),
    getAppointmentColors: vi.fn(),
}));
vi.mock('@/modules/appointments', () => ({ appointmentApi: api }));
vi.mock('@/modules/appointment-colors', () => ({ pickInitialColorId: () => 'kolor-1' }));
vi.mock('@/modules/customers/api/customerDetailApi', () => ({ customerDetailApi: { getCustomerDetail: vi.fn(async () => ({ customer: {} })) } }));
vi.mock('@/modules/vehicles/api/vehicleApi', () => ({ vehicleApi: { getVehicleDetail: vi.fn(async () => ({ vehicle: null })) } }));
vi.mock('./CheckInWizardView', () => ({
    CheckInWizardView: (p: { colors: unknown[] }) => <p>kreator przyjęcia ({p.colors.length} kolorów)</p>,
}));

import { CheckInWizardWrapper } from './CheckInWizardWrapper';
import { WalkInCheckInWrapper } from './WalkInCheckInWrapper';

const networkError = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });
const reservation = {
    id: 'r-1', customerId: 'c-1', vehicleId: null, status: 'SCHEDULED', services: [],
    customer: { firstName: 'Jan', lastName: 'Kowalski', phone: '500', email: '' }, vehicle: null,
};

const Location = () => <span data-testid="sciezka">{useLocation().pathname}</span>;
const renderAt = (path: string) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={theme}>
                <Routes>
                    <Route path="/checkin/:reservationId" element={<CheckInWizardWrapper />} />
                    <Route path="/checkin-new" element={<WalkInCheckInWrapper />} />
                    <Route path="*" element={null} />
                </Routes>
                <Location />
            </ThemeProvider>
        </MemoryRouter>
    </QueryClientProvider>,
);

beforeEach(() => {
    api.getAppointment.mockResolvedValue(reservation);
    api.getAppointmentColors.mockResolvedValue([{ id: 'kolor-1' }]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Przyjęcie z rezerwacji - nie da się zacząć', () => {
    it('nieudane kolory: mówi o kolorach, nie o rezerwacji, i ponawia tylko kolory', async () => {
        api.getAppointmentColors.mockRejectedValueOnce(networkError());
        renderAt('/checkin/r-1');

        expect(await screen.findByText('Nie udało się wczytać kolorów wizyt')).toBeInTheDocument();
        expect(screen.getByText(/Brak połączenia z serwerem/)).toBeInTheDocument();
        expect(screen.queryByText(/Nie znaleziono rezerwacji/)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

        expect(await screen.findByText('kreator przyjęcia (1 kolorów)')).toBeInTheDocument();
        expect(api.getAppointmentColors).toHaveBeenCalledTimes(2);
        expect(api.getAppointment).toHaveBeenCalledTimes(1);
    });

    it('nieudana rezerwacja: polski komunikat, ponowienie i powrót do kalendarza', async () => {
        api.getAppointment.mockRejectedValue(networkError());
        renderAt('/checkin/r-1');

        // Zapytanie o rezerwację ponawia raz samo (retry: 1) - stąd dłuższe czekanie.
        expect(await screen.findByText('Nie udało się wczytać danych rezerwacji', undefined, { timeout: 4000 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
        expect(screen.queryByText('Network Error')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Wróć do kalendarza' }));
        expect(screen.getByTestId('sciezka')).toHaveTextContent('/calendar');
    });
});

describe('Walk-in - nie da się zacząć', () => {
    it('bez listy kolorów kreator nie startuje, jest ponowienie', async () => {
        api.getAppointmentColors.mockRejectedValueOnce(networkError());
        renderAt('/checkin-new');

        expect(await screen.findByText('Nie udało się wczytać kolorów wizyt')).toBeInTheDocument();
        expect(screen.queryByText(/kreator przyjęcia/)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        await waitFor(() => expect(screen.getByText('kreator przyjęcia (1 kolorów)')).toBeInTheDocument());
    });
});
