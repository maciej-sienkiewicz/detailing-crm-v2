// @vitest-environment jsdom
//
// Dodanie pojazdu z karty klienta: rodzaj startuje jako samochód, wybiera katalog marek
// i modeli, jego zmiana kasuje markę i model z poprzedniego katalogu, a POST
// /v1/customers/{id}/vehicles dostaje rodzaj zawsze.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({ addVehicle: vi.fn() }));
vi.mock('../api/customerDetailApi', () => ({ customerDetailApi: api }));

// Selektory ciągną katalog z sieci - tu wystarczą zwykłe pola, które mówią, z jakiego
// katalogu by podpowiadały.
vi.mock('@/modules/vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="brand" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="model" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
}));

import { AddVehicleModal } from './AddVehicleModal';

const Providers = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    return (
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </QueryClientProvider>
    );
};

const renderModal = () => {
    const onClose = vi.fn();
    render(<Providers><AddVehicleModal customerId="cust-1" customerName="Anna Nowak" onClose={onClose} /></Providers>);
    return { onClose };
};

const brand = () => screen.getByTestId('brand') as HTMLInputElement;
const model = () => screen.getByTestId('model') as HTMLInputElement;
const kindButton = (name: string) => screen.getByRole('button', { name });

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AddVehicleModal (karta klienta) - rodzaj pojazdu', () => {
    it('startuje jako samochód, z katalogiem samochodów w obu selektorach', () => {
        renderModal();
        expect(kindButton('Samochód')).toHaveAttribute('aria-pressed', 'true');
        expect(brand().dataset.kind).toBe('CAR');
        expect(model().dataset.kind).toBe('CAR');
    });

    it('motocykl: rodzaj trafia do payloadu razem z marką i modelem z katalogu motocykli', async () => {
        api.addVehicle.mockResolvedValue({ id: 'v-1' });
        const { onClose } = renderModal();

        fireEvent.click(kindButton('Motocykl'));
        expect(brand().dataset.kind).toBe('MOTORCYCLE');
        fireEvent.change(brand(), { target: { value: 'Yamaha' } });
        fireEvent.change(model(), { target: { value: 'MT-07' } });
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj pojazd' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.addVehicle).toHaveBeenCalledWith('cust-1', expect.objectContaining({
            kind: 'MOTORCYCLE', make: 'Yamaha', model: 'MT-07',
        }));
    });

    it('samochód bez dotykania przełącznika też wysyła rodzaj', async () => {
        api.addVehicle.mockResolvedValue({ id: 'v-1' });
        const { onClose } = renderModal();
        fireEvent.change(brand(), { target: { value: 'Audi' } });
        fireEvent.change(model(), { target: { value: 'A4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj pojazd' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.addVehicle.mock.calls[0][1]).toMatchObject({ kind: 'CAR', make: 'Audi', model: 'A4' });
    });

    it('zmiana rodzaju czyści markę i model i znów blokuje „Dodaj pojazd"', () => {
        renderModal();
        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'Civic' } });

        fireEvent.click(kindButton('Motocykl'));

        expect(brand().value).toBe('');
        expect(model().value).toBe('');
        expect(screen.getByRole('button', { name: 'Wybierz markę i model' })).toBeDisabled();
    });

    it('klik w już wybrany rodzaj niczego nie kasuje', () => {
        renderModal();
        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'Civic' } });

        fireEvent.click(kindButton('Samochód'));

        expect(brand().value).toBe('Honda');
        expect(model().value).toBe('Civic');
    });
});
