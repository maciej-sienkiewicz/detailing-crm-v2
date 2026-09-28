// @vitest-environment jsdom
//
// Odhaczanie wykonanych usług na widoku wizyty: domyślnie wyłączone, bo potrzebuje go
// tylko część studiów; właściciel włącza je jednym kliknięciem.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VisitViewConfig } from '../types';
import { ServiceChecklistCard } from './ServiceChecklistCard';

const mutate = vi.fn();
let config: VisitViewConfig | undefined;
let isOwner = true;

vi.mock('../hooks/useCompany', () => ({
    useVisitViewConfig: () => ({ config, isLoading: false }),
    useUpdateVisitViewConfig: () => ({ mutate, isPending: false }),
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
            <ServiceChecklistCard />
        </StyledThemeProvider>,
    );

const toggle = () => screen.getByRole('switch', { name: 'Odhaczanie wykonanych usług na widoku wizyty' });

describe('ServiceChecklistCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOwner = true;
        config = undefined;
    });

    it('zanim przyjdzie odpowiedź, odhaczanie jest wyłączone - jak domyślnie w backendzie', () => {
        renderCard();

        expect(toggle()).not.toBeChecked();
    });

    it('włączenie zapisuje się od razu po kliknięciu', async () => {
        config = { serviceChecklistEnabled: false };
        renderCard();

        await userEvent.click(toggle());

        expect(mutate).toHaveBeenCalledWith({ serviceChecklistEnabled: true }, expect.anything());
    });

    it('włączone mówi, że to tylko znak i gdzie widać, kto odhaczył', () => {
        config = { serviceChecklistEnabled: true };
        renderCard();

        expect(toggle()).toBeChecked();
        expect(document.body.textContent).toContain('historii wizyty');
        expect(document.body.textContent).toContain('niczego nie blokuje');
        expect(document.body.textContent).not.toContain('·');
    });

    it('tylko właściciel może zmienić ustawienie', () => {
        isOwner = false;
        renderCard();

        expect(toggle()).toBeDisabled();
        expect(screen.getByText('Zmienić to ustawienie może tylko właściciel studia.')).toBeInTheDocument();
    });
});
