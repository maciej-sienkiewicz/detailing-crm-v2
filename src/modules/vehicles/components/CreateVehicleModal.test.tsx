// @vitest-environment jsdom
//
// Nowy pojazd z listy pojazdów: rodzaj (samochód / motocykl) wybiera katalog marek
// i modeli, startuje jako samochód, a jego zmiana kasuje markę i model z poprzedniego
// katalogu. Rodzaj trafia do POST /v1/vehicles zawsze.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { t } from '@/common/i18n';

const api = vi.hoisted(() => ({ createVehicle: vi.fn() }));
vi.mock('../api/vehicleApi', () => ({ vehicleApi: api }));

// Selektory ciągną katalog z sieci - tu wystarczą zwykłe pola, które mówią, z jakiego
// katalogu by podpowiadały.
vi.mock('./BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="brand" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange, kind, brand }: { value?: string; onChange: (v: string) => void; kind?: string; brand?: string }) =>
        <input data-testid="model" data-kind={kind} data-brand={brand ?? ''} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
}));

vi.mock('./OwnerSelect', () => ({
    OwnerSelect: ({ onChange }: { onChange: (ids: string[]) => void }) =>
        <button type="button" onClick={() => onChange(['cust-1'])}>Wybierz właściciela</button>,
}));

import { CreateVehicleModal } from './CreateVehicleModal';

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
    render(<Providers><CreateVehicleModal isOpen onClose={onClose} /></Providers>);
    return { onClose };
};

const brand = () => screen.getByTestId('brand') as HTMLInputElement;
const model = () => screen.getByTestId('model') as HTMLInputElement;
const kindButton = (name: string) => screen.getByRole('button', { name });

const fillRequired = (brandName: string, modelName: string) => {
    fireEvent.change(brand(), { target: { value: brandName } });
    fireEvent.change(model(), { target: { value: modelName } });
    fireEvent.change(screen.getByLabelText(t.vehicles.form.licensePlate), { target: { value: 'WA12345' } });
    fireEvent.change(screen.getByLabelText(t.vehicles.form.color), { target: { value: 'Czarny' } });
    // Właściciel siedzi w drugiej zakładce; potem wracamy do danych pojazdu.
    fireEvent.click(screen.getByRole('button', { name: 'Właściciele' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wybierz właściciela' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dane pojazdu' }));
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: t.vehicles.form.submit }));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CreateVehicleModal - rodzaj pojazdu', () => {
    it('nowy pojazd startuje jako samochód i podpowiada z katalogu samochodów', () => {
        renderModal();
        expect(kindButton('Samochód')).toHaveAttribute('aria-pressed', 'true');
        expect(brand().dataset.kind).toBe('CAR');
        expect(model().dataset.kind).toBe('CAR');
    });

    it('motocykl: selektory biorą katalog motocykli, a rodzaj trafia do payloadu', async () => {
        api.createVehicle.mockResolvedValue({ id: 'v-1' });
        renderModal();

        fireEvent.click(kindButton('Motocykl'));
        expect(brand().dataset.kind).toBe('MOTORCYCLE');
        expect(model().dataset.kind).toBe('MOTORCYCLE');

        fillRequired('Honda', 'CBR');
        submit();

        await waitFor(() => expect(api.createVehicle).toHaveBeenCalledTimes(1));
        expect(api.createVehicle).toHaveBeenCalledWith(expect.objectContaining({
            kind: 'MOTORCYCLE',
            brand: 'Honda',
            model: 'CBR',
            licensePlate: 'WA12345',
            ownerIds: ['cust-1'],
        }));
    });

    it('samochód bez dotykania przełącznika też wysyła rodzaj', async () => {
        api.createVehicle.mockResolvedValue({ id: 'v-1' });
        renderModal();
        fillRequired('Audi', 'A4');
        submit();

        await waitFor(() => expect(api.createVehicle).toHaveBeenCalledTimes(1));
        expect(api.createVehicle.mock.calls[0][0]).toMatchObject({ kind: 'CAR', brand: 'Audi', model: 'A4' });
    });

    it('zmiana rodzaju czyści markę i model - pochodzą z katalogu innego rodzaju', () => {
        renderModal();
        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'Civic' } });

        fireEvent.click(kindButton('Motocykl'));

        expect(brand().value).toBe('');
        expect(model().value).toBe('');
    });

    it('klik w już wybrany rodzaj niczego nie kasuje', () => {
        renderModal();
        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'Civic' } });

        fireEvent.click(kindButton('Samochód'));

        expect(brand().value).toBe('Honda');
        expect(model().value).toBe('Civic');
    });

    it('zmiana marki czyści model', () => {
        renderModal();
        fireEvent.change(brand(), { target: { value: 'Honda' } });
        fireEvent.change(model(), { target: { value: 'Civic' } });
        fireEvent.change(brand(), { target: { value: 'Mazda' } });

        expect(model().value).toBe('');
        expect(model().dataset.brand).toBe('Mazda');
    });

    it('jednoznakowy model z katalogu (Mazda 3, BMW R) przechodzi walidację', async () => {
        api.createVehicle.mockResolvedValue({ id: 'v-1' });
        renderModal();
        fillRequired('Mazda', '3');
        submit();

        await waitFor(() => expect(api.createVehicle).toHaveBeenCalledTimes(1));
        expect(api.createVehicle.mock.calls[0][0]).toMatchObject({ brand: 'Mazda', model: '3' });
    });

    it('bez marki i modelu (np. po zmianie rodzaju) zapis stoi i mówi, czego brakuje', async () => {
        renderModal();
        fillRequired('Honda', 'Civic');
        fireEvent.click(kindButton('Motocykl'));
        submit();

        expect(await screen.findByText('Wybierz markę')).toBeInTheDocument();
        expect(screen.getByText('Wybierz model')).toBeInTheDocument();
        expect(api.createVehicle).not.toHaveBeenCalled();
    });
});
