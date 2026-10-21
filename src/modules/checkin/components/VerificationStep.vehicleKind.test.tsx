// @vitest-environment jsdom
//
// Sekcja „Pojazd" formularza przyjęcia (i edycji rezerwacji) a rodzaj pojazdu.
// Rodzaj wybiera katalog marek i modeli oraz schemat mapy uszkodzeń na kolejnym kroku,
// więc każda droga, którą pojazd trafia do formularza, musi go przenieść: wybór
// z wyszukiwarki, auto-wybór jedynego pojazdu klienta i podpowiedzi pojazdów klienta.
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CheckInFormData } from '../types';
import type { SelectedVehicle } from './VehicleSearchModal';

const apis = vi.hoisted(() => ({
    searchCustomers: vi.fn(),
    getCustomerVehicles: vi.fn(),
    getCustomerDetail: vi.fn(),
    getVehicleDetail: vi.fn(),
}));

vi.mock('@/modules/appointments/api/appointmentApi', () => ({
    appointmentApi: { searchCustomers: apis.searchCustomers },
}));
vi.mock('@/modules/customers/api/customerDetailApi', () => ({
    customerDetailApi: { getCustomerDetail: apis.getCustomerDetail, getCustomerVehicles: apis.getCustomerVehicles },
}));
vi.mock('@/modules/vehicles/api/vehicleApi', () => ({ vehicleApi: { getVehicleDetail: apis.getVehicleDetail } }));
vi.mock('@/modules/settings/hooks/useCompany', () => ({ useVehicleFormConfig: () => ({ config: undefined }) }));

/* Selektory ciągną katalog z serwera - atrapa pokazuje, z którego katalogu mają podpowiadać. */
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
            <button type="button" onClick={() => onChange('Civic')}>Model Civic</button>
        </div>
    ),
}));

/* Wyszukiwarka ma własny test; tu ważne jest tylko to, co formularz robi z wyborem. */
const pickedFromSearch: SelectedVehicle = {
    id: 'moto-9', kind: 'MOTORCYCLE', brand: 'Ducati', model: 'Monster', yearOfProduction: 2022, isNew: false,
};
vi.mock('./VehicleSearchModal', () => ({
    VehicleSearchModal: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (v: SelectedVehicle) => void }) => (
        isOpen ? <button type="button" onClick={() => onSelect(pickedFromSearch)}>Wybierz Ducati</button> : null
    ),
}));

// Reszta formularza nie ma związku z rodzajem pojazdu.
vi.mock('./EditableServicesTable', () => ({ EditableServicesTable: () => null }));
vi.mock('./CustomerDetailsModal', () => ({ CustomerDetailsModal: () => null }));
vi.mock('./VehicleDetailsModal', () => ({ VehicleDetailsModal: () => null }));
vi.mock('./VehicleFieldSettings', () => ({ VehicleFieldSettings: () => null }));
vi.mock('@/modules/appointments/components/CustomerModal', () => ({ CustomerModal: () => null }));
vi.mock('@/modules/calendar/components/QuickColorModal', () => ({ QuickColorModal: () => null }));
vi.mock('@/common/components/DateTimePicker', () => ({ DateRangePicker: () => null }));
vi.mock('@/common/components/ColorDropdown', () => ({ ColorDropdown: () => null }));
vi.mock('@/modules/vehicles/components/vin/VinCameraButton', () => ({ VinCameraButton: () => null }));

import { VerificationStep } from './VerificationStep';

const makeFormData = (overrides: Partial<CheckInFormData> = {}): CheckInFormData => ({
    title: '',
    customerData: { id: '', firstName: '', lastName: '', phone: '', email: '' },
    hasFullCustomerData: false,
    isNewCustomer: true,
    vehicleData: null,
    isNewVehicle: true,
    vehicleOwnershipAction: null,
    vehicleHandoff: {
        isHandedOffByOtherPerson: false,
        contactPerson: { firstName: '', lastName: '', phone: '', email: '' },
    },
    homeAddress: null,
    company: null,
    technicalState: {
        mileage: 0,
        deposit: { keys: true, registrationDocument: false, other: false },
        inspectionNotes: '',
        protocolNotes: '',
    },
    photos: [],
    damagePoints: [],
    services: [],
    appointmentColorId: 'color-1',
    ...overrides,
});

/** Rodzic jak kreator przyjęcia: trzyma stan formularza i pokazuje, co z niego wyjdzie dalej. */
const Harness = ({ initial, initialVehicleData }: {
    initial: CheckInFormData;
    initialVehicleData?: CheckInFormData['vehicleData'];
}) => {
    const [formData, setFormData] = useState(initial);
    return (
        <>
            <VerificationStep
                formData={formData}
                errors={{}}
                onChange={updates => setFormData(prev => ({ ...prev, ...updates }))}
                onServicesChange={vi.fn()}
                colors={[]}
                showTechnicalSection={false}
                initialVehicleData={initialVehicleData}
                initialIsNewVehicle={initialVehicleData === undefined ? undefined : !initialVehicleData}
            />
            <output data-testid="form-state">
                {JSON.stringify({ vehicleData: formData.vehicleData, isNewVehicle: formData.isNewVehicle })}
            </output>
        </>
    );
};

const formState = (): Pick<CheckInFormData, 'vehicleData' | 'isNewVehicle'> =>
    JSON.parse(screen.getByTestId('form-state').textContent ?? '{}');

const renderStep = (initial: CheckInFormData, initialVehicleData?: CheckInFormData['vehicleData']) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <Harness initial={initial} initialVehicleData={initialVehicleData} />
        </ThemeProvider>
    </QueryClientProvider>,
);

const kindButton = (label: 'Samochód' | 'Motocykl') =>
    within(screen.getByRole('group', { name: 'Rodzaj pojazdu' })).getByRole('button', { name: label });

/** Wybiera klienta z podpowiedzi pod polem „Imię". */
const pickCustomerFromAutocomplete = async (user: ReturnType<typeof userEvent.setup>) => {
    const firstName = screen.getByText('Imię').parentElement!.querySelector('input')!;
    await user.click(firstName);
    await user.type(firstName, 'Jan');
    await user.click(await screen.findByRole('button', { name: /Jan Kowalski/i }));
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('VerificationStep - rodzaj pojazdu', () => {
    it('nowy pojazd startuje jako samochód, a przełączenie na motocykl zmienia katalog obu pól', async () => {
        const user = userEvent.setup();
        renderStep(makeFormData());

        expect(kindButton('Samochód').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('brand-select').textContent).toBe('CAR:');

        await user.click(kindButton('Motocykl'));

        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:');
        expect(screen.getByTestId('model-select').textContent).toBe('MOTORCYCLE::');
        expect(formState().vehicleData).toMatchObject({ kind: 'MOTORCYCLE', brand: '', model: '' });
        expect(formState().isNewVehicle).toBe(true);
    });

    it('zmiana rodzaju czyści markę i model - są z innego katalogu', async () => {
        const user = userEvent.setup();
        renderStep(makeFormData());

        await user.click(screen.getByRole('button', { name: 'Marka Honda' }));
        await user.click(screen.getByRole('button', { name: 'Model Civic' }));
        expect(screen.getByTestId('model-select').textContent).toBe('CAR:Honda:Civic');

        await user.click(kindButton('Motocykl'));

        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:');
        expect(screen.getByTestId('model-select').textContent).toBe('MOTORCYCLE::');
        expect(formState().vehicleData).toMatchObject({ kind: 'MOTORCYCLE', brand: '', model: '' });
    });

    it('kliknięcie w bieżący rodzaj niczego nie czyści', async () => {
        const user = userEvent.setup();
        renderStep(makeFormData({
            vehicleData: { id: '', kind: 'CAR', brand: 'Honda', model: 'Civic' },
        }));

        await user.click(kindButton('Samochód'));

        expect(formState().vehicleData).toMatchObject({ brand: 'Honda', model: 'Civic' });
    });

    it('pojazd z rezerwacji pokazuje swój rodzaj i podpowiada z jego katalogu', () => {
        const moto = { id: 'moto-1', kind: 'MOTORCYCLE' as const, brand: 'Yamaha', model: 'MT-07' };
        renderStep(makeFormData({ vehicleData: moto, isNewVehicle: false }), moto);

        expect(kindButton('Motocykl').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:Yamaha');
        expect(screen.getByTestId('model-select').textContent).toBe('MOTORCYCLE:Yamaha:MT-07');
    });

    it('zmiana rodzaju pojazdu z rezerwacji da się wycofać', async () => {
        const user = userEvent.setup();
        const car = { id: 'car-1', kind: 'CAR' as const, brand: 'Honda', model: 'Civic' };
        renderStep(makeFormData({ vehicleData: car, isNewVehicle: false }), car);

        // „Wycofaj zmiany" ma też sekcja klienta - bierzemy ten obok „Zmień pojazd".
        const vehicleActions = screen.getByRole('button', { name: /Zmień pojazd/i }).parentElement!;
        const reset = within(vehicleActions).getByRole('button', { name: /Wycofaj zmiany/i }) as HTMLButtonElement;
        expect(reset.disabled).toBe(true);

        await user.click(kindButton('Motocykl'));
        expect(formState().vehicleData).toMatchObject({ id: 'car-1', kind: 'MOTORCYCLE', brand: '', model: '' });
        expect(reset.disabled).toBe(false);

        await user.click(reset);
        expect(formState().vehicleData).toEqual(car);
    });

    it('pojazd wybrany w wyszukiwarce przenosi swój rodzaj', async () => {
        const user = userEvent.setup();
        renderStep(makeFormData());

        await user.click(screen.getByRole('button', { name: /Wybierz pojazd/i }));
        await user.click(screen.getByRole('button', { name: 'Wybierz Ducati' }));

        expect(formState().vehicleData).toMatchObject({ id: 'moto-9', kind: 'MOTORCYCLE', brand: 'Ducati' });
        expect(formState().isNewVehicle).toBe(false);
        expect(kindButton('Motocykl').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:Ducati');
    });

    it('jedyny pojazd klienta wybrany automatycznie przenosi swój rodzaj', async () => {
        apis.searchCustomers.mockResolvedValue([
            { id: 'cust-1', firstName: 'Jan', lastName: 'Kowalski', phone: '600100200', email: null },
        ]);
        apis.getCustomerDetail.mockResolvedValue({ customer: { homeAddress: null, company: null } });
        apis.getCustomerVehicles.mockResolvedValue([
            { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', year: 2021, licensePlate: 'KR 1234A' },
        ]);
        const user = userEvent.setup();
        renderStep(makeFormData());

        await pickCustomerFromAutocomplete(user);

        await waitFor(() => expect(formState().vehicleData).toMatchObject({
            id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07',
        }));
        expect(screen.getByTestId('brand-select').textContent).toBe('MOTORCYCLE:Yamaha');
    });

    it('podpowiedź pojazdu klienta przenosi jego rodzaj', async () => {
        apis.searchCustomers.mockResolvedValue([
            { id: 'cust-1', firstName: 'Jan', lastName: 'Kowalski', phone: '600100200', email: null },
        ]);
        apis.getCustomerDetail.mockResolvedValue({ customer: { homeAddress: null, company: null } });
        apis.getCustomerVehicles.mockResolvedValue([
            { id: 'car-1', brand: 'Toyota', model: 'Corolla', year: 2018, licensePlate: 'KR 55599' },
            { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07', year: 2021, licensePlate: 'KR 1234A' },
        ]);
        const user = userEvent.setup();
        renderStep(makeFormData());

        await pickCustomerFromAutocomplete(user);
        await user.click(await screen.findByRole('button', { name: /Yamaha MT-07/i }));

        expect(formState().vehicleData).toMatchObject({ id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha' });
        expect(kindButton('Motocykl').getAttribute('aria-pressed')).toBe('true');
    });
});
