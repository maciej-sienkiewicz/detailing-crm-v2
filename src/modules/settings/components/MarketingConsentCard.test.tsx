// @vitest-environment jsdom
//
// Zgoda na informacje handlowe w „Moim koncie": wycofanie jednym przełącznikiem,
// a przed odpowiedzią serwera nie ma przełącznika, który udawałby „brak zgody".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { MARKETING_CONSENT_TEXT } from '@/modules/legal/marketingConsent';
import { MarketingConsentCard, consentStatus } from './MarketingConsentCard';
import { marketingConsentApi } from '../api/marketingConsentApi';

vi.mock('../api/marketingConsentApi', () => ({
    marketingConsentApi: { get: vi.fn(), set: vi.fn() },
}));

const renderCard = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <MarketingConsentCard />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('MarketingConsentCard', () => {
    it('wycofuje udzieloną zgodę jednym przełącznikiem', async () => {
        vi.mocked(marketingConsentApi.get).mockResolvedValue({
            granted: true, changedAt: '2026-11-01T10:00:00Z', wording: MARKETING_CONSENT_TEXT,
        });
        vi.mocked(marketingConsentApi.set).mockResolvedValue({
            granted: false, changedAt: '2026-11-03T10:00:00Z', wording: MARKETING_CONSENT_TEXT,
        });
        renderCard();

        const toggle = await screen.findByRole('switch', { name: 'Informacje handlowe e-mailem' });
        expect(toggle).toBeChecked();
        expect(screen.getByText(MARKETING_CONSENT_TEXT)).toBeTruthy();

        await userEvent.click(toggle);

        expect(marketingConsentApi.set).toHaveBeenCalledWith(false);
        await waitFor(() => expect(screen.getByRole('switch')).not.toBeChecked());
        expect(screen.getByText('Zgoda wycofana 3 listopada 2026.')).toBeTruthy();
    });

    it('bez odpowiedzi serwera nie pokazuje przełącznika', async () => {
        vi.mocked(marketingConsentApi.get).mockRejectedValue(new Error('offline'));
        renderCard();

        await screen.findByText('Nie udało się wczytać zgody. Sprawdź połączenie z internetem.');
        expect(screen.queryByRole('switch')).toBeNull();
    });

    it('opisuje brak zgody, gdy nikt jej nie udzielił', () => {
        expect(consentStatus({ granted: false, changedAt: null, wording: '' })).toBe('Zgody nie udzielono.');
    });
});
