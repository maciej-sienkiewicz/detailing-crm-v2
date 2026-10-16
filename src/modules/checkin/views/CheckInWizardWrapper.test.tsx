// @vitest-environment jsdom
//
// Przyjęcie rezerwacji startuje z pojazdem rezerwacji. Jego rodzaj musi dojść do
// formularza: od niego zależy katalog marek, a na kroku zdjęć domyślny schemat mapy
// uszkodzeń - bez niego motocykl z rezerwacji otwierałby się jako sedan.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CheckInFormData } from '../types';

const apis = vi.hoisted(() => ({
    getAppointment: vi.fn(),
    getAppointmentColors: vi.fn(),
    getCustomerDetail: vi.fn(),
    getVehicleDetail: vi.fn(),
}));
const captured = vi.hoisted(() => ({ initialData: null as Partial<CheckInFormData> | null }));

vi.mock('@/modules/appointments', () => ({
    appointmentApi: { getAppointment: apis.getAppointment, getAppointmentColors: apis.getAppointmentColors },
}));
vi.mock('@/modules/appointment-colors', () => ({ pickInitialColorId: () => 'color-1' }));
vi.mock('@/modules/customers/api/customerDetailApi', () => ({
    customerDetailApi: { getCustomerDetail: apis.getCustomerDetail },
}));
vi.mock('@/modules/vehicles/api/vehicleApi', () => ({ vehicleApi: { getVehicleDetail: apis.getVehicleDetail } }));
vi.mock('./CheckInWizardView', () => ({
    CheckInWizardView: ({ initialData }: { initialData: Partial<CheckInFormData> }) => {
        captured.initialData = initialData;
        return <p>kreator przyjęcia</p>;
    },
}));

import { CheckInWizardWrapper } from './CheckInWizardWrapper';

const reservation = {
    id: 'res-1',
    customerId: 'cust-1',
    vehicleId: 'moto-1',
    customer: { firstName: 'Jan', lastName: 'Kowalski', phone: '600100200', email: '' },
    vehicle: { kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', year: 2021, licensePlate: 'KR 1234A' },
    services: [],
    status: 'CREATED',
};

const renderWrapper = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <MemoryRouter initialEntries={['/checkin/res-1']}>
                <Routes>
                    <Route path="/checkin/:reservationId" element={<CheckInWizardWrapper />} />
                </Routes>
            </MemoryRouter>
        </ThemeProvider>
    </QueryClientProvider>,
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    captured.initialData = null;
});

describe('CheckInWizardWrapper - rodzaj pojazdu z rezerwacji', () => {
    it('bierze rodzaj z karty pojazdu', async () => {
        apis.getAppointment.mockResolvedValue(reservation);
        apis.getAppointmentColors.mockResolvedValue([]);
        apis.getCustomerDetail.mockResolvedValue({ customer: { homeAddress: null, company: null } });
        apis.getVehicleDetail.mockResolvedValue({
            vehicle: { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', yearOfProduction: 2021, licensePlate: 'KR 1234A' },
        });

        renderWrapper();
        await screen.findByText('kreator przyjęcia');

        expect(captured.initialData?.vehicleData).toMatchObject({ id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha' });
        expect(captured.initialData?.isNewVehicle).toBe(false);
    });

    it('bez karty pojazdu bierze rodzaj z samej rezerwacji', async () => {
        apis.getAppointment.mockResolvedValue(reservation);
        apis.getAppointmentColors.mockResolvedValue([]);
        apis.getCustomerDetail.mockResolvedValue({ customer: { homeAddress: null, company: null } });
        apis.getVehicleDetail.mockRejectedValue(new Error('404'));

        renderWrapper();
        // Wrapper ponawia zapytanie o kartę pojazdu raz (ok. 1 s), zanim z niej zrezygnuje.
        await screen.findByText('kreator przyjęcia', {}, { timeout: 4000 });

        expect(captured.initialData?.vehicleData).toMatchObject({ id: 'moto-1', kind: 'MOTORCYCLE', model: 'MT-07' });
    });
});
