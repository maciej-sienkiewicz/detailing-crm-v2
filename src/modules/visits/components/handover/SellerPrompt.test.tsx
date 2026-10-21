// @vitest-environment jsdom
//
// Dane firmy uzupełnione przy wydaniu pojazdu trafiają pod ten sam klucz, z którego czytają
// Ustawienia, i to z odpowiedzi zapisu - bez drugiego pobrania. Wcześniej wydanie trzymało
// je pod osobnym kluczem, więc Ustawienia pokazywały brak NIP-u do odświeżenia strony.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/common/theme';
import type { CompanySettings } from '@/modules/settings/types';

const api = vi.hoisted(() => ({ getCompanySettings: vi.fn(), updateCompanySettings: vi.fn() }));
vi.mock('@/modules/settings/api/companyApi', () => ({ companyApi: api }));

import { SellerPrompt } from './SellerPrompt';
import { COMPANY_SETTINGS_KEY } from '@/modules/settings/api/companySettingsQuery';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SellerPrompt', () => {
    it('zapis podmienia dane firmy w cache Ustawień, bez ponownego pobrania', async () => {
        const saved = { name: 'Studio', taxId: '5250000000', city: 'Warszawa' } as CompanySettings;
        api.updateCompanySettings.mockResolvedValue(saved);
        const client = new QueryClient();
        render(
            <QueryClientProvider client={client}>
                <ThemeProvider theme={theme}>
                    <SellerPrompt company={{ name: 'Studio', taxId: '' } as CompanySettings} />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        await userEvent.type(screen.getByLabelText(/NIP/), '5250000000');
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz dane firmy' }));

        await waitFor(() => expect(client.getQueryData(COMPANY_SETTINGS_KEY)).toEqual(saved));
        expect(api.getCompanySettings).not.toHaveBeenCalled();
    });
});
