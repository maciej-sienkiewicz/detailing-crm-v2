// @vitest-environment jsdom
//
// Payload przyjęcia a rodzaj pojazdu. Dwie rzeczy, które łatwo zgubić po drodze:
// rodzaj nowego pojazdu (bez niego serwer zapisze motocykl jako samochód) i schemat
// mapy uszkodzeń, który pracownik WIDZIAŁ - dawniej bez ręcznego wyboru szło puste
// pole i raport PDF rysował punkty z motocykla na sedanie.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CheckInFormData, WalkInVisitPayload, ReservationToVisitPayload } from '../types';

const api = vi.hoisted(() => ({
    createWalkInVisit: vi.fn(),
    createVisitFromReservation: vi.fn(),
    reviseDraftServices: vi.fn(),
}));
vi.mock('../api/checkinApi', () => ({ checkinApi: api }));
vi.mock('@/modules/dashboard/hooks/useDashboard', () => ({ DASHBOARD_STATS_KEY: ['dashboard', 'stats'] }));

import { useCheckInWizard } from './useCheckInWizard';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

const base: Partial<CheckInFormData> = {
    customerData: { id: 'cust-1', firstName: 'Jan', lastName: 'Kowalski', phone: '+48 600 100 200', email: '' },
    isNewCustomer: false,
    services: [],
    appointmentColorId: 'color-1',
};

const submitWalkIn = async (initial: Partial<CheckInFormData>): Promise<WalkInVisitPayload> => {
    const { result } = renderHook(() => useCheckInWizard(undefined, { ...base, ...initial }), { wrapper });
    await act(() => result.current.submitCheckIn());
    return api.createWalkInVisit.mock.calls[0][0] as WalkInVisitPayload;
};

beforeEach(() => {
    localStorage.clear();
    api.createWalkInVisit.mockResolvedValue({ visitId: 'v-1' });
    api.createVisitFromReservation.mockResolvedValue({ visitId: 'v-1' });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCheckInWizard - rodzaj pojazdu w payloadzie przyjęcia', () => {
    it('nowy motocykl idzie z rodzajem i ze schematem motocykla', async () => {
        const payload = await submitWalkIn({
            vehicleData: { id: '', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', yearOfProduction: 2021 },
            isNewVehicle: true,
        });

        expect(payload.vehicle).toMatchObject({ mode: 'NEW', newData: { kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07' } });
        expect(payload.damageVehicleType).toBe('motorcycle');
    });

    it('nowy pojazd bez rodzaju w formularzu to samochód ze schematem sedana', async () => {
        const payload = await submitWalkIn({
            vehicleData: { id: '', brand: 'Toyota', model: 'Corolla' },
            isNewVehicle: true,
        });

        expect(payload.vehicle).toMatchObject({ mode: 'NEW', newData: { kind: 'CAR' } });
        expect(payload.damageVehicleType).toBe('sedan');
    });

    it('schemat wybrany ręcznie wygrywa z domyślnym dla rodzaju', async () => {
        const payload = await submitWalkIn({
            vehicleData: { id: '', kind: 'MOTORCYCLE', brand: 'Sea-Doo', model: 'Spark' },
            isNewVehicle: true,
            damageVehicleType: 'jetski',
        });

        expect(payload.damageVehicleType).toBe('jetski');
    });

    it('istniejący pojazd ze znanym rodzajem wysyła go w aktualizacji', async () => {
        const { result } = renderHook(() => useCheckInWizard('res-1', {
            ...base,
            vehicleData: { id: 'veh-1', kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 600RR' },
            isNewVehicle: false,
        }), { wrapper });
        await act(() => result.current.submitCheckIn());

        const payload = api.createVisitFromReservation.mock.calls[0][0] as ReservationToVisitPayload;
        expect(payload.vehicle).toMatchObject({ mode: 'UPDATE', id: 'veh-1', updateData: { kind: 'MOTORCYCLE' } });
        expect(payload.damageVehicleType).toBe('motorcycle');
    });

    it('istniejący pojazd bez znanego rodzaju nie zgaduje go w aktualizacji', async () => {
        // Zgadnięty „samochód" przestawiłby na serwerze motocykl, o którym formularz
        // po prostu nic nie wiedział (pominięty rodzaj = bez zmian).
        const payload = await submitWalkIn({
            vehicleData: { id: 'veh-2', brand: 'Skoda', model: 'Octavia' },
            isNewVehicle: false,
        });

        expect(payload.vehicle.mode).toBe('UPDATE');
        const updateData = (payload.vehicle as Extract<typeof payload.vehicle, { mode: 'UPDATE' }>).updateData;
        expect('kind' in updateData).toBe(false);
        expect(payload.damageVehicleType).toBe('sedan');
    });
});
