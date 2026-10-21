// @vitest-environment jsdom
//
// Rodzaj pojazdu w szybkiej rezerwacji (kalendarz, „Umów wizytę" z leada).
//
// Marki i modele podpowiadamy z katalogu wybranego rodzaju, a Honda, BMW czy Suzuki są
// w obu katalogach z innymi modelami. Stąd trzy reguły, których pilnuje ten plik:
// zmiana rodzaju czyści markę i model (tak jak zmiana marki czyści model), pojazd
// wybrany z listy klienta przynosi swój rodzaj, a nowy pojazd dojeżdża do zapisu
// z rodzajem - bez niego serwer założyłby w kartotece samochód.

import type { FormEvent, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';
import type { Vehicle } from '@/modules/appointments/types';
import { useQuickEventForm } from './useQuickEventForm';
import type { QuickEventFormData } from './types';

const never = () => new Promise<never>(() => {});

const CUSTOMER_VEHICLES: Record<string, Vehicle[]> = {
    'cust-moto': [{ id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 650R', year: 2022, licensePlate: 'WA 1234M' }],
};

vi.mock('@/core', () => ({ apiClient: { get: () => never() } }));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: false }) }));
// Dostęp do ustawień automatyzacji = moduł i uprawnienie COMMUNICATION_SEND; test zakłada uprawnienie.
vi.mock('@/modules/message-templates/hooks/useMessageAutomationAccess', () => ({ useMessageAutomationAccess: () => false }));
vi.mock('@/modules/appointment-colors', () => ({ pickInitialColorId: () => '' }));
vi.mock('@/modules/appointment-colors/api/appointmentColorApi', () => ({ appointmentColorApi: {} }));
vi.mock('@/modules/sms-campaigns/api/smsCampaignsApi', () => ({ fetchAutomationConfig: () => never() }));
vi.mock('@/modules/visit-card/api/visitCardApi', () => ({ visitCardApi: { getSettings: () => never() } }));
vi.mock('@/modules/appointments/hooks/useAppointmentForm', () => ({
    useCustomerVehicles: (customerId: string | undefined) => ({
        data: customerId ? (CUSTOMER_VEHICLES[customerId] ?? []) : undefined,
        isLoading: false,
    }),
    useCustomerSearch: () => ({ data: [] }),
}));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', async () => {
    const { useCallback, useState } = await import('react');
    return {
        useMessageDefaults: () => ({ sms: () => undefined, email: () => undefined }),
        useDefaultChoice: (defaultValue: boolean | undefined, fallback: boolean) => {
            const [choice, setChoice] = useState<boolean | null>(null);
            const set = useCallback((next: boolean) => setChoice(next), []);
            const reset = useCallback(() => setChoice(null), []);
            return [choice ?? defaultValue ?? fallback, set, reset] as const;
        },
    };
});

const setup = () => {
    const onSave = vi.fn<(data: QuickEventFormData) => void>();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
        () => useQuickEventForm({ isOpen: true, eventData: null, onClose: () => {}, onSave, ref: null }),
        { wrapper },
    );
    return { result, onSave };
};

describe('QuickEventModal - rodzaj pojazdu', () => {
    it('nowy pojazd startuje jako samochód', () => {
        const { result } = setup();

        expect(result.current.vehicleKind).toBe('CAR');
    });

    it('zmiana rodzaju czyści markę i model, ten sam rodzaj nie rusza niczego', () => {
        const { result } = setup();

        act(() => {
            result.current.setVehicleBrand('BMW');
            result.current.setVehicleModel('X5');
            result.current.setVehicleYear('2021');
        });
        act(() => result.current.changeVehicleKind('MOTORCYCLE'));

        expect(result.current.vehicleKind).toBe('MOTORCYCLE');
        expect(result.current.vehicleBrand).toBe('');
        expect(result.current.vehicleModel).toBe('');
        // Rok nie pochodzi z katalogu - zostaje.
        expect(result.current.vehicleYear).toBe('2021');

        act(() => {
            result.current.setVehicleBrand('BMW');
            result.current.setVehicleModel('R 1250 GS');
        });
        act(() => result.current.changeVehicleKind('MOTORCYCLE'));

        expect(result.current.vehicleBrand).toBe('BMW');
        expect(result.current.vehicleModel).toBe('R 1250 GS');
    });

    it('pojazd wybrany z listy klienta przynosi swój rodzaj', () => {
        const { result } = setup();

        act(() => result.current.handleVehicleSelect({
            id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 650R', isNew: false,
        }));

        expect(result.current.vehicleKind).toBe('MOTORCYCLE');
        expect(result.current.selectedVehicle?.kind).toBe('MOTORCYCLE');

        // Pojazd sprzed rodzajów (brak pola) to samochód.
        act(() => result.current.handleVehicleSelect({ id: 'car-1', brand: 'Audi', model: 'A4', isNew: false }));

        expect(result.current.vehicleKind).toBe('CAR');
        expect(result.current.selectedVehicle?.kind).toBe('CAR');
    });

    it('jedyny pojazd klienta wybrany automatycznie przynosi swój rodzaj, inny klient wraca do samochodu', async () => {
        const { result } = setup();

        act(() => result.current.handleCustomerSelect({ id: 'cust-moto', isNew: false }));

        await waitFor(() => expect(result.current.selectedVehicle?.id).toBe('moto-1'));
        expect(result.current.vehicleKind).toBe('MOTORCYCLE');
        expect(result.current.selectedVehicle?.kind).toBe('MOTORCYCLE');

        act(() => result.current.handleCustomerSelect({ id: 'cust-empty', isNew: false }));

        expect(result.current.selectedVehicle).toBeNull();
        expect(result.current.vehicleKind).toBe('CAR');
    });

    it('nowy motocykl wpisany w pola dojeżdża do zapisu z rodzajem', async () => {
        const { result, onSave } = setup();

        act(() => {
            result.current.handleCustomerSelect({ id: 'cust-empty', isNew: false });
            result.current.setStartDateTime('2026-10-20T10:00');
            result.current.setEndDateTime('2026-10-20T12:00');
            result.current.setSelectedColorId('color-1');
            result.current.setSelectedServiceIds(['line-1']);
            result.current.setServicePrices({ 'line-1': 300 });
        });
        act(() => result.current.changeVehicleKind('MOTORCYCLE'));
        act(() => {
            result.current.setVehicleBrand('Honda');
            result.current.setVehicleModel('CBR 650R');
        });

        await act(() => result.current.handleSubmit({ preventDefault: () => {} } as FormEvent));

        expect(onSave).toHaveBeenCalledTimes(1);
        const data = onSave.mock.calls[0][0];
        expect(data.vehicle).toMatchObject({ kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 650R', isNew: true });
        expect(buildAppointmentPayload(data).vehicle).toEqual({
            mode: 'NEW',
            newData: { kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 650R', year: undefined },
        });
    });

    it('„dodaj" nowy pojazd zapamiętuje rodzaj z przełącznika', () => {
        const { result } = setup();

        act(() => result.current.changeVehicleKind('MOTORCYCLE'));
        act(() => {
            result.current.setVehicleBrand('Yamaha');
            result.current.setVehicleModel('MT-07');
        });
        act(() => result.current.handleAddNewVehicleDirectly());

        expect(result.current.selectedVehicle).toMatchObject({ kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', isNew: true });
    });
});
