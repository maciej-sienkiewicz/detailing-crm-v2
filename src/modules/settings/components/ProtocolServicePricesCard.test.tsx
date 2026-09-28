// @vitest-environment jsdom
//
// Ceny usług na protokole przyjęcia: domyślnie wyłączone (same nazwy i kwota łączna),
// właściciel włącza je jednym kliknięciem.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ProtocolContentConfig } from '../types';
import { ProtocolServicePricesCard } from './ProtocolServicePricesCard';

const mutate = vi.fn();
let config: ProtocolContentConfig | undefined;
let isOwner = true;

vi.mock('../hooks/useCompany', () => ({
    useProtocolContentConfig: () => ({ config, isLoading: false, isError: false }),
    useUpdateProtocolContentConfig: () => ({ mutate, isPending: false }),
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
            <ProtocolServicePricesCard />
        </StyledThemeProvider>,
    );

const toggle = () => screen.getByRole('switch', { name: 'Czy pokazywać ceny usług na protokole przyjęcia?' });

describe('ProtocolServicePricesCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOwner = true;
        config = undefined;
    });

    it('zanim przyjdzie odpowiedź, ceny są wyłączone - jak domyślnie w backendzie', () => {
        renderCard();

        expect(toggle()).not.toBeChecked();
    });

    it('włączenie zapisuje się od razu po kliknięciu', async () => {
        config = { showServicePrices: false };
        renderCard();

        await userEvent.click(toggle());

        expect(mutate).toHaveBeenCalledWith({ showServicePrices: true }, expect.anything());
    });

    it('włączone ceny pokazują przykład, bez kropki jako separatora', () => {
        config = { showServicePrices: true };
        renderCard();

        expect(toggle()).toBeChecked();
        expect(document.body.textContent).toContain('(1900.00 PLN brutto)');
        expect(document.body.textContent).not.toContain('·');
    });

    it('tylko właściciel może zmienić ustawienie', () => {
        isOwner = false;
        renderCard();

        expect(toggle()).toBeDisabled();
        expect(screen.getByText('Zmienić to ustawienie może tylko właściciel studia.')).toBeInTheDocument();
    });
});
