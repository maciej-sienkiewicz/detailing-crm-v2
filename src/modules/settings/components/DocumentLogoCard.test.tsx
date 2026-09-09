// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { DocumentLogoConfig } from '../types';
import { DocumentLogoCard } from './DocumentLogoCard';

const mutate = vi.fn();
let config: DocumentLogoConfig | undefined;
let isOwner = true;

vi.mock('../hooks/useCompany', () => ({
    useDocumentLogoConfig: () => ({ config, isLoading: false, isError: false }),
    useUpdateDocumentLogoConfig: () => ({ mutate, isPending: false }),
}));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ isOwner, can: () => true, defaultRoute: '/' }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

const renderCard = () =>
    render(
        <MemoryRouter>
            <StyledThemeProvider theme={theme}>
                <DocumentLogoCard />
            </StyledThemeProvider>
        </MemoryRouter>,
    );

const toggle = () => screen.getByRole('switch', { name: 'Czy umieszczać logo na dokumentach?' });

describe('DocumentLogoCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOwner = true;
        config = { showLogoOnDocuments: true, hasLogo: true };
    });

    it('pokazuje stan z backendu i zapisuje zmianę od razu po kliknięciu', async () => {
        renderCard();

        expect(toggle()).toBeChecked();
        await userEvent.click(toggle());

        expect(mutate).toHaveBeenCalledWith({ showLogoOnDocuments: false }, expect.anything());
    });

    it('bez wgranego logo odsyła do Danych firmy', () => {
        config = { showLogoOnDocuments: true, hasLogo: false };
        renderCard();

        const link = screen.getByRole('link', { name: 'Danych firmy' });
        expect(link).toHaveAttribute('href', '/settings?tab=company');
        expect(screen.getByText(/nie ma jeszcze wgranego logo/)).toBeInTheDocument();
    });

    it('pracownik bez uprawnień właściciela widzi ustawienie, ale go nie zmieni', async () => {
        isOwner = false;
        renderCard();

        expect(toggle()).toBeDisabled();
        expect(screen.getByText(/tylko właściciel studia/)).toBeInTheDocument();
        await userEvent.click(toggle());
        expect(mutate).not.toHaveBeenCalled();
    });

    it('wyłączone logo opisuje aktualny stan, a nie skutek wyłączenia', () => {
        config = { showLogoOnDocuments: false, hasLogo: true };
        renderCard();

        expect(toggle()).not.toBeChecked();
        expect(screen.getByText('Logo nie jest obecnie umieszczane na dokumentach.')).toBeInTheDocument();
    });
});
