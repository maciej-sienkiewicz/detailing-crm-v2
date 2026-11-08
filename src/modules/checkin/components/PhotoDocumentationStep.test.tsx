// @vitest-environment jsdom
//
// Krok „Zdjęcia i uszkodzenia" a rodzaj pojazdu: mapa uszkodzeń i telefon (kod QR)
// startują od tego samego schematu - wybranego ręcznie albo domyślnego dla rodzaju.
// Dawniej oba miejsca zaczynały zawsze od sedana, także przy motocyklu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CheckInFormData } from '../types';

vi.mock('./VehicleDamageMapper', () => ({
    VehicleDamageMapper: ({ vehicleType }: { vehicleType?: string }) => <div data-testid="damage-mapper">{vehicleType}</div>,
}));
vi.mock('./CheckinQRGenerator', () => ({
    CheckinQRGenerator: ({ vehicleType, damageMap }: { vehicleType?: string; damageMap?: boolean }) =>
        <div data-testid="qr" data-damage-map={String(damageMap)}>{vehicleType}</div>,
}));
vi.mock('../hooks/usePhotoUpload', () => ({
    usePhotoUpload: () => ({
        photos: [], uploadPhoto: vi.fn(), deletePhoto: vi.fn(), refreshPhotos: vi.fn(),
        isUploading: false, isDeleting: false, isRefreshing: false,
    }),
}));
vi.mock('@/modules/photos/hooks/usePhotoTags', () => ({
    useTagSuggestions: () => ({ data: [] }),
    useUpdatePhotoTags: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/modules/photos/components/PhotoTagEditModal', () => ({ PhotoTagEditModal: () => null }));

import { PhotoDocumentationStep } from './PhotoDocumentationStep';

const formData = (overrides: Partial<CheckInFormData>): CheckInFormData => ({
    title: '',
    customerData: { id: 'c1', firstName: 'Jan', lastName: 'Kowalski', phone: '', email: '' },
    hasFullCustomerData: true,
    isNewCustomer: false,
    vehicleData: null,
    isNewVehicle: false,
    vehicleHandoff: { isHandedOffByOtherPerson: false, contactPerson: { firstName: '', lastName: '', phone: '', email: '' } },
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

const renderStep = async (data: CheckInFormData) => {
    const user = userEvent.setup();
    render(
        <ThemeProvider theme={theme}>
            <PhotoDocumentationStep formData={data} photoSessionScope="scope-1" qrCheckinId="chk-1" onChange={vi.fn()} />
        </ThemeProvider>,
    );
    await user.click(screen.getByRole('switch', { name: 'Rozwiń' }));
};

afterEach(() => {
    cleanup();
});

describe('PhotoDocumentationStep - schemat mapy uszkodzeń', () => {
    it('motocykl bez wybranego schematu dostaje schemat motocykla na mapie i w telefonie', async () => {
        await renderStep(formData({
            vehicleData: { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Yamaha', model: 'MT-07' },
        }));

        expect(screen.getByTestId('damage-mapper').textContent).toBe('motorcycle');
        expect(screen.getByTestId('qr').textContent).toBe('motorcycle');
    });

    it('pojazd bez rodzaju zostaje przy sedanie', async () => {
        await renderStep(formData({ vehicleData: { id: 'car-1', brand: 'Toyota', model: 'Corolla' } }));

        expect(screen.getByTestId('damage-mapper').textContent).toBe('sedan');
        expect(screen.getByTestId('qr').textContent).toBe('sedan');
    });

    it('schemat wybrany ręcznie wygrywa z rodzajem - i ten sam idzie do telefonu', async () => {
        await renderStep(formData({
            vehicleData: { id: 'moto-1', kind: 'MOTORCYCLE', brand: 'Sea-Doo', model: 'Spark' },
            damageVehicleType: 'jetski',
        }));

        expect(screen.getByTestId('damage-mapper').textContent).toBe('jetski');
        expect(screen.getByTestId('qr').textContent).toBe('jetski');
    });
});

describe('PhotoDocumentationStep - pojazd „Inny"', () => {
    it('nie ma sekcji mapy uszkodzeń, a telefon dostaje kod bez niej', () => {
        render(
            <ThemeProvider theme={theme}>
                <PhotoDocumentationStep
                    formData={formData({ vehicleData: { id: 'heli-1', kind: 'OTHER', brand: 'Robinson', model: 'R44' } })}
                    photoSessionScope="scope-1"
                    qrCheckinId="chk-1"
                    onChange={vi.fn()}
                />
            </ThemeProvider>,
        );

        expect(screen.queryByText(/Dokumentacja uszkodzeń/)).not.toBeInTheDocument();
        expect(screen.queryByRole('switch', { name: 'Rozwiń' })).not.toBeInTheDocument();
        expect(screen.getByTestId('qr').dataset.damageMap).toBe('false');
    });

    it('samochód ma mapę i telefon z mapą', async () => {
        await renderStep(formData({ vehicleData: { id: 'car-1', kind: 'CAR', brand: 'Toyota', model: 'Corolla' } }));
        expect(screen.getByTestId('damage-mapper')).toBeInTheDocument();
        expect(screen.getByTestId('qr').dataset.damageMap).toBe('true');
    });
});
