// @vitest-environment jsdom
//
// Wejście wprost w przyjęcie pojazdu (/reservations/:id/checkin, /checkin/new) bez danych
// osobowych: czytelna odmowa zamiast kreatora z gwiazdkami - i bez jednego zapytania.
// Bramkę zakłada router (withPersonalDataGate), więc test owija widoki tak samo.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { CheckInWizardWrapper } from '@/modules/checkin/views/CheckInWizardWrapper';
import { WalkInCheckInWrapper } from '@/modules/checkin/views/WalkInCheckInWrapper';
import { withPersonalDataGate } from './PersonalDataGate';

let permissions: string[] | null = [];
vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'r@studio.pl', permissions }, setUser: vi.fn() }),
}));

const ReservationCheckIn = withPersonalDataGate(CheckInWizardWrapper, 'canCreateVisit');
const WalkInCheckIn = withPersonalDataGate(WalkInCheckInWrapper, 'canCreateVisit');

const renderAt = (url: string, path: string, element: ReactNode) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <MemoryRouter initialEntries={[url]}>
                    <Routes>
                        <Route path={path} element={element} />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        </ThemeProvider>
    </QueryClientProvider>,
);

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('przyjęcie pojazdu bez danych osobowych', () => {
    it('z rezerwacji: odmowa i żadnego odczytu rezerwacji ani kolorów', () => {
        permissions = ['VISITS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        const getAppointment = vi.spyOn(appointmentApi, 'getAppointment');
        const getColors = vi.spyOn(appointmentColorApi, 'getColors');

        renderAt('/reservations/a-1/checkin', '/reservations/:reservationId/checkin', <ReservationCheckIn />);

        expect(screen.getByText('Nie możesz przyjąć pojazdu')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Wróć do kalendarza' })).toBeTruthy();
        expect(getAppointment).not.toHaveBeenCalled();
        expect(getColors).not.toHaveBeenCalled();
    });

    it('„z marszu": odmowa i żadnego zapytania', () => {
        permissions = ['VISITS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        const getColors = vi.spyOn(appointmentColorApi, 'getColors');

        renderAt('/checkin/new', '/checkin/new', <WalkInCheckIn />);

        expect(screen.getByText('Nie możesz przyjąć pojazdu')).toBeTruthy();
        expect(getColors).not.toHaveBeenCalled();
    });

    it('z danymi osobowymi kreator startuje (pobiera kolory), bez odmowy', () => {
        permissions = ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'];
        const getColors = vi.spyOn(appointmentColorApi, 'getColors').mockReturnValue(new Promise(() => {}));

        renderAt('/checkin/new', '/checkin/new', <WalkInCheckIn />);

        expect(screen.queryByText('Nie możesz przyjąć pojazdu')).toBeNull();
        expect(getColors).toHaveBeenCalled();
    });
});
