// @vitest-environment jsdom
//
// VIN na protokole przyjęcia: domyślnie wyłączony, właściciel włącza go jednym
// kliknięciem. Gdy formularz pojazdu nie zbiera VIN-u, włączyć się nie da - protokół
// miałby pustą ramkę - ale wyłączyć można zawsze.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ProtocolContentConfig, VehicleFormConfig } from '../types';
import { ProtocolVinCard } from './ProtocolVinCard';

const mutate = vi.fn();
let config: ProtocolContentConfig | undefined;
let vehicleForm: VehicleFormConfig | undefined;
let isOwner = true;

vi.mock('../hooks/useCompany', () => ({
    useProtocolContentConfig: () => ({ config, isLoading: false, isError: false }),
    useUpdateProtocolContentConfig: () => ({ mutate, isPending: false }),
    useVehicleFormConfig: () => ({ config: vehicleForm, isLoading: false }),
}));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ isOwner, can: () => true, defaultRoute: '/' }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

const renderCard = () =>
    render(
        <StyledThemeProvider theme={theme}>
            <ProtocolVinCard />
        </StyledThemeProvider>,
    );

const toggle = () => screen.getByRole('switch', { name: 'VIN na protokole przyjęcia' });

describe('ProtocolVinCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOwner = true;
        config = undefined;
        vehicleForm = { hiddenFields: [] };
    });

    it('zanim przyjdzie odpowiedź, VIN jest wyłączony - jak domyślnie w backendzie', () => {
        renderCard();

        expect(toggle()).not.toBeChecked();
    });

    it('włączenie wysyła tylko VIN - ceny usług zostają, jakie były', async () => {
        config = { showServicePrices: true, showVin: false };
        renderCard();

        await userEvent.click(toggle());

        expect(mutate).toHaveBeenCalledWith({ showVin: true }, expect.anything());
    });

    it('podpis mówi, że wygenerowane protokoły się nie zmieniają', () => {
        config = { showServicePrices: false, showVin: true };
        renderCard();

        expect(toggle()).toBeChecked();
        expect(document.body.textContent).toContain('już wygenerowane zostają bez zmian');
        expect(document.body.textContent).not.toContain('·');
    });

    it('przy VIN ukrytym w formularzu pojazdu nie da się go włączyć', () => {
        config = { showServicePrices: false, showVin: false };
        vehicleForm = { hiddenFields: ['vin'] };
        renderCard();

        expect(toggle()).toBeDisabled();
        expect(document.body.textContent).toContain('VIN jest ukryty w formularzu pojazdu');
    });

    it('włączony VIN da się wyłączyć nawet przy ukrytym polu w formularzu', async () => {
        config = { showServicePrices: false, showVin: true };
        vehicleForm = { hiddenFields: ['vin'] };
        renderCard();

        await userEvent.click(toggle());

        expect(mutate).toHaveBeenCalledWith({ showVin: false }, expect.anything());
    });

    it('tylko właściciel może zmienić ustawienie', () => {
        isOwner = false;
        renderCard();

        expect(toggle()).toBeDisabled();
        expect(screen.getByText('Zmienić to ustawienie może tylko właściciel studia.')).toBeInTheDocument();
    });
});
