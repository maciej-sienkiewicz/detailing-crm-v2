// @vitest-environment jsdom
//
// Edycja pojazdu z karty pojazdu: okno pokazuje rodzaj zapisany przy pojeździe (brak
// pola = samochód), podpowiada marki i modele z katalogu tego rodzaju, a zmiana rodzaju
// kasuje markę i model z poprzedniego katalogu. PATCH niesie rodzaj zawsze.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { Vehicle } from '../types';

const api = vi.hoisted(() => ({ updateVehicle: vi.fn() }));
vi.mock('../api/vehicleApi', () => ({ vehicleApi: api }));

// Selektory ciągną katalog z sieci - tu wystarczą zwykłe pola, które mówią, z jakiego
// katalogu by podpowiadały.
vi.mock('@/modules/vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="brand" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="model" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
}));

import { EditVehicleModal } from './EditVehicleModal';

const vehicle = (patch: Partial<Vehicle> = {}): Vehicle => ({
    id: 'veh-1',
    licensePlate: 'WA12345',
    brand: 'Honda',
    model: 'Civic',
    yearOfProduction: 2019,
    color: 'Czarny',
    currentMileage: 45000,
    technicalNotes: '',
    status: 'active',
    owners: [],
    stats: {
        totalVisits: 0,
        lastVisitDate: null,
        totalSpent: { netAmount: 0, grossAmount: 0, currency: 'PLN' },
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    deletedBy: null,
    ...patch,
});

const Providers = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    return (
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

const renderModal = (v: Vehicle) => {
    const onClose = vi.fn();
    render(<Providers><EditVehicleModal isOpen onClose={onClose} vehicle={v} /></Providers>);
    return { onClose };
};

const brand = () => screen.getByTestId('brand') as HTMLInputElement;
const model = () => screen.getByTestId('model') as HTMLInputElement;
const kindButton = (name: string) => screen.getByRole('button', { name });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('EditVehicleModal - rodzaj pojazdu', () => {
    it('motocykl otwiera się jako motocykl, z katalogiem motocykli w obu selektorach', () => {
        renderModal(vehicle({ kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07' }));
        expect(kindButton('Motocykl')).toHaveAttribute('aria-pressed', 'true');
        expect(brand().dataset.kind).toBe('MOTORCYCLE');
        expect(model().dataset.kind).toBe('MOTORCYCLE');
        expect(brand().value).toBe('Yamaha');
    });

    it('pojazd bez rodzaju w danych to samochód', () => {
        renderModal(vehicle({ kind: undefined }));
        expect(kindButton('Samochód')).toHaveAttribute('aria-pressed', 'true');
        expect(brand().dataset.kind).toBe('CAR');
    });

    it('zapis bez zmiany rodzaju wysyła rodzaj pojazdu', async () => {
        api.updateVehicle.mockResolvedValue(vehicle());
        const { onClose } = renderModal(vehicle({ kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07' }));
        save();

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateVehicle).toHaveBeenCalledWith('veh-1', expect.objectContaining({
            kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07',
        }));
    });

    it('zmiana rodzaju czyści markę i model, a zapis stoi, dopóki nie wybierze się nowych', async () => {
        api.updateVehicle.mockResolvedValue(vehicle());
        const { onClose } = renderModal(vehicle());

        fireEvent.click(kindButton('Motocykl'));
        expect(brand().value).toBe('');
        expect(model().value).toBe('');
        expect(brand().dataset.kind).toBe('MOTORCYCLE');

        save();
        expect(await screen.findByText('Wybierz markę')).toBeInTheDocument();
        expect(api.updateVehicle).not.toHaveBeenCalled();

        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'CBR' } });
        save();

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateVehicle).toHaveBeenCalledWith('veh-1', expect.objectContaining({
            kind: 'MOTORCYCLE', brand: 'Honda', model: 'CBR',
        }));
    });

    it('klik w już wybrany rodzaj niczego nie kasuje', () => {
        renderModal(vehicle());
        fireEvent.click(kindButton('Samochód'));
        expect(brand().value).toBe('Honda');
        expect(model().value).toBe('Civic');
    });
});
