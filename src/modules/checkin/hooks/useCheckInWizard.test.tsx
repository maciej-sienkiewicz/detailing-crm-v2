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
    reviseDraft: vi.fn(),
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
    api.reviseDraft.mockResolvedValue({ visitId: 'v-1', protocols: [] });
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

/**
 * Zgłoszenie z 19.10: klient przy podpisie widzi błąd w danych, pracownik poprawia
 * formularz, a protokół pokazuje stare dane - poprawka szkicu wysyłała same usługi.
 */
describe('useCheckInWizard - poprawka szkicu po „Wróć do formularza"', () => {
    it('wysyła cały poprawiony formularz, nie same usługi', async () => {
        const { result } = renderHook(() => useCheckInWizard(undefined, {
            ...base,
            vehicleData: { id: 'veh-1', brand: 'Audi', model: 'A6', licensePlate: 'PO 12345' },
        }), { wrapper });
        await act(() => result.current.submitCheckIn());

        act(() => result.current.updateFormData({
            customerData: { id: 'cust-1', firstName: 'Jan', lastName: 'Nowak', phone: '+48 600 100 200', email: '' },
            vehicleData: { id: 'veh-1', brand: 'Audi', model: 'A6', licensePlate: 'PO 54321' },
            technicalState: {
                mileage: 121_500, deposit: { keys: true, registrationDocument: true, other: false },
                inspectionNotes: '', protocolNotes: 'Rysa na zderzaku',
            },
        }));
        await act(() => result.current.reviseDraft('v-1'));

        const [visitId, payload] = api.reviseDraft.mock.calls[0] as [string, WalkInVisitPayload];
        expect(visitId).toBe('v-1');
        expect(payload.customer).toMatchObject({ mode: 'UPDATE', id: 'cust-1', updateData: { lastName: 'Nowak' } });
        expect(payload.vehicle).toMatchObject({ mode: 'UPDATE', id: 'veh-1', updateData: { licensePlate: 'PO 54321' } });
        expect(payload.technicalState).toMatchObject({ mileage: 121_500, protocolNotes: 'Rysa na zderzaku' });
        expect(payload.appointmentColorId).toBe('color-1');
    });

    it('klienta i pojazd założone przy przyjęciu poprawia, zamiast zakładać drugi raz', async () => {
        api.createWalkInVisit.mockResolvedValue({ visitId: 'v-1', protocols: [], customerId: 'cust-new', vehicleId: 'veh-new' });
        const { result } = renderHook(() => useCheckInWizard(undefined, {
            ...base,
            customerData: { id: '', firstName: 'Anna', lastName: 'Kowalksa', phone: '+48 600 300 400', email: '' },
            isNewCustomer: true,
            vehicleData: { id: '', brand: 'Kia', model: 'Ceed' },
            isNewVehicle: true,
        }), { wrapper });

        await act(() => result.current.submitCheckIn());
        expect((api.createWalkInVisit.mock.calls[0][0] as WalkInVisitPayload).customer?.mode).toBe('NEW');

        act(() => result.current.updateFormData({
            customerData: { id: '', firstName: 'Anna', lastName: 'Kowalska', phone: '+48 600 300 400', email: '' },
        }));
        await act(() => result.current.reviseDraft('v-1'));

        const payload = api.reviseDraft.mock.calls[0][1] as WalkInVisitPayload;
        expect(payload.customer).toMatchObject({ mode: 'UPDATE', id: 'cust-new', updateData: { lastName: 'Kowalska' } });
        expect(payload.vehicle).toMatchObject({ mode: 'UPDATE', id: 'veh-new', updateData: { brand: 'Kia' } });
    });

    it('przyjęcie z rezerwacji nie wysyła identyfikatora walk-inu', async () => {
        const { result } = renderHook(
            () => useCheckInWizard('r-1', { ...base, vehicleData: { id: 'veh-1', brand: 'Audi', model: 'A6' } }, 'r-1'),
            { wrapper },
        );
        await act(() => result.current.submitCheckIn());

        const payload = api.createVisitFromReservation.mock.calls[0][0] as ReservationToVisitPayload & { qrCheckinId?: string };
        expect(payload.reservationId).toBe('r-1');
        expect(payload.qrCheckinId).toBeUndefined();
    });
});
