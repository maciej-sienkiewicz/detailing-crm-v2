// @vitest-environment jsdom
//
// Wyszukiwarka pojazdów przy przyjęciu a rodzaj pojazdu: wybór z listy przenosi rodzaj
// dalej (od niego zależy katalog marek i schemat mapy uszkodzeń), a nowy pojazd
// podpowiada marki z katalogu wybranego rodzaju.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const apis = vi.hoisted(() => ({
    getVehicles: vi.fn(),
    getCustomerVehicles: vi.fn(),
}));
vi.mock('@/modules/vehicles/api/vehicleApi', () => ({ vehicleApi: { getVehicles: apis.getVehicles } }));
vi.mock('@/modules/appointments/api/appointmentApi', () => ({
    appointmentApi: { getCustomerVehicles: apis.getCustomerVehicles },
}));

/*
 * Selektory marki i modelu ciągną katalog z serwera. Tu liczy się tylko to, z którego
 * katalogu mają podpowiadać i co dostają z formularza - atrapa to pokazuje.
 */
vi.mock('@/modules/vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, kind, onChange }: { value?: string; kind?: string; onChange: (v: string) => void }) => (
        <div>
            <span data-testid="brand-select">{`${kind}:${value ?? ''}`}</span>
            <button type="button" onClick={() => onChange('Honda')}>Marka Honda</button>
        </div>
    ),
    ModelSelect: ({ value, kind, brand, onChange }: { value?: string; kind?: string; brand?: string; onChange: (v: string) => void }) => (
        <div>
            <span data-testid="model-select">{`${kind}:${brand ?? ''}:${value ?? ''}`}</span>
            <button type="button" onClick={() => onChange('CBR 600RR')}>Model CBR</button>
        </div>
    ),
}));

import { VehicleSearchModal, type SelectedVehicle } from './VehicleSearchModal';

const wrap = (ui: ReactNode) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
);

const renderModal = (props: { customerId?: string } = {}) => {
    const onSelect = vi.fn<(vehicle: SelectedVehicle) => void>();
    render(wrap(
        <VehicleSearchModal isOpen onClose={vi.fn()} onSelect={onSelect} customerId={props.customerId} />,
    ));
    return { onSelect };
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('VehicleSearchModal - rodzaj pojazdu', () => {
    it('pojazd klienta wybrany z listy przenosi swój rodzaj i ma ikonę motocykla', async () => {
        apis.getCustomerVehicles.mockResolvedValue([
            { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', year: 2021, licensePlate: 'KR 1234A' },
            { id: 'car-1', brand: 'Toyota', model: 'Corolla', year: 2018, licensePlate: 'KR 55599' },
        ]);
        const user = userEvent.setup();
        const { onSelect } = renderModal({ customerId: 'cust-1' });

        const motoRow = await screen.findByRole('button', { name: /Yamaha MT-07/i });
        // Ikona mówi, co jest motocyklem; pojazd bez rodzaju w danych to samochód.
        expect(motoRow.querySelector('[data-kind="MOTORCYCLE"]')).not.toBeNull();
        const carRow = screen.getByRole('button', { name: /Toyota Corolla/i });
        expect(carRow.querySelector('[data-kind="MOTORCYCLE"]')).toBeNull();

        await user.click(motoRow);

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', isNew: false,
        }));
    });

    it('pojazd z wyszukiwarki przenosi swój rodzaj', async () => {
        apis.getVehicles.mockResolvedValue({
            data: [{
                id: 'moto-2', kind: 'MOTORCYCLE', brand: 'Honda', model: 'Africa Twin', yearOfProduction: 2020,
                licensePlate: 'WA 7777B', owners: [{ customerId: 'cust-9', customerName: 'Anna Nowak' }],
            }],
        });
        const user = userEvent.setup();
        const { onSelect } = renderModal();

        await user.type(screen.getByPlaceholderText(/Szukaj po marce/i), 'Africa');
        const row = await screen.findByRole('button', { name: /Honda Africa Twin/i });
        expect(row.querySelector('[data-kind="MOTORCYCLE"]')).not.toBeNull();
        await user.click(row);

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            id: 'moto-2', kind: 'MOTORCYCLE', ownerCustomerIds: ['cust-9'],
        }));
    });

    it('nowy pojazd startuje jako samochód, a zmiana rodzaju czyści markę i model', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.click(screen.getByRole('button', { name: /Dodaj nowy pojazd/i }));
        expect(screen.getByRole('button', { name: /Samochód/i }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('brand-select').textContent).toBe('CAR:');

        await user.click(screen.getByRole('button', { name: 'Marka Honda' }));
        await user.click(screen.getByRole('button', { name: 'Model CBR' }));
        expect(screen.getByTestId('model-select').textContent).toBe('CAR:Honda:CBR 600RR');

        // Honda-auto i Honda-motocykl to różne katalogi modeli: wybór z jednego nie
        // może przejść do drugiego.
        await user.click(screen.getByRole('button', { name: /Motocykl/i }));
        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:');
        expect(screen.getByTestId('model-select').textContent).toBe('MOTORCYCLE::');
    });

    it('nowy motocykl trafia do wyboru z rodzajem', async () => {
        const user = userEvent.setup();
        const { onSelect } = renderModal();

        await user.click(screen.getByRole('button', { name: /Dodaj nowy pojazd/i }));
        await user.click(screen.getByRole('button', { name: /Motocykl/i }));
        await user.click(screen.getByRole('button', { name: 'Marka Honda' }));
        await user.click(screen.getByRole('button', { name: 'Model CBR' }));
        await user.click(screen.getByRole('button', { name: /^Dodaj pojazd$/i }));

        await waitFor(() => expect(onSelect).toHaveBeenCalled());
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR 600RR', isNew: true,
        }));
    });
});
