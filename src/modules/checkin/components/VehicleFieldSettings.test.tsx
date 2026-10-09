// @vitest-environment jsdom
//
// „Ustawienia pól" w sekcji „Dane pojazdu": właściciel wybiera, które pola pojazdu
// pokazuje formularz wizyty; reszta zespołu widzi wybór, ale go nie zmienia.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VehicleFormConfig } from '@/modules/settings/types';
import { isVehicleFieldVisible } from '../utils/vehicleFormFields';
import { VehicleFieldSettings } from './VehicleFieldSettings';

const mutate = vi.fn();
let config: VehicleFormConfig | undefined;
let isOwner = true;

vi.mock('@/modules/settings/hooks/useCompany', () => ({
    useVehicleFormConfig: () => ({ config, isLoading: false }),
    useUpdateVehicleFormConfig: () => ({ mutate, isPending: false }),
}));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ isOwner, can: () => true, defaultRoute: '/' }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

const open = async () => {
    render(
        <ThemeProvider theme={theme}>
            <VehicleFieldSettings />
        </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ustawienia pól' }));
};

const toggle = (label: string) => screen.getByRole('switch', { name: `Pokazuj pole ${label}` });

describe('VehicleFieldSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOwner = true;
        config = { hiddenFields: [] };
    });

    it('lista ma wszystkie pola do wyboru, domyślnie widoczne', async () => {
        await open();
        for (const label of ['Rok produkcji', 'Numer rejestracyjny', 'Przebieg', 'Kolor', 'VIN']) {
            expect(toggle(label)).toBeChecked();
        }
        expect(screen.getByText(/Marka i model są zawsze/)).toBeInTheDocument();
    });

    it('wyłączenie pola zapisuje listę ukrytych, z poprzednio ukrytymi', async () => {
        config = { hiddenFields: ['color'] };
        await open();

        await userEvent.click(toggle('VIN'));

        expect(mutate).toHaveBeenCalledWith({ hiddenFields: ['color', 'vin'] }, expect.anything());
    });

    it('włączenie z powrotem zdejmuje pole z listy ukrytych', async () => {
        config = { hiddenFields: ['mileage', 'vin'] };
        await open();

        await userEvent.click(toggle('Przebieg'));

        expect(mutate).toHaveBeenCalledWith({ hiddenFields: ['vin'] }, expect.anything());
    });

    it('pracownik widzi wybór, ale go nie zmienia - to ustawienie całego studia', async () => {
        isOwner = false;
        await open();

        expect(toggle('VIN')).toBeDisabled();
        expect(screen.getByText(/Pola wybiera właściciel studia/)).toBeInTheDocument();
    });
});

describe('isVehicleFieldVisible', () => {
    it('bez ustawień (jeszcze nie przyszły albo błąd) widać wszystko', () => {
        expect(isVehicleFieldVisible(undefined, 'vin')).toBe(true);
        expect(isVehicleFieldVisible([], 'mileage')).toBe(true);
    });

    it('pole z listy ukrytych znika', () => {
        expect(isVehicleFieldVisible(['vin'], 'vin')).toBe(false);
        expect(isVehicleFieldVisible(['vin'], 'color')).toBe(true);
    });
});
