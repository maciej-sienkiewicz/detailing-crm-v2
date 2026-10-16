// @vitest-environment jsdom
//
// Podpowiedź danych sprzedawcy przy wydaniu (7fa63b4). Zgłoszenie: zapis składał pełny
// obiekt ustawień z tego, co ekran akurat miał - gdy ustawień nie udało się wczytać albo
// nie było ich w formularzu, telefon, e-mail i REGON studia nadpisywały się pustymi.
// Zapis ma nieść wyłącznie nazwę i NIP, a z adresu tylko pola, które ktoś tu zmienił.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { companyApi } from '@/modules/settings/api/companyApi';
import type { CompanySettings } from '@/modules/settings/types';
import { SellerPrompt } from './SellerPrompt';

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock('@/modules/settings/api/companyApi', () => ({
    companyApi: { getCompanySettings: vi.fn(), updateCompanySettings: vi.fn() },
}));

const getCompanySettings = vi.mocked(companyApi.getCompanySettings);
const updateCompanySettings = vi.mocked(companyApi.updateCompanySettings);

/** Studio z kompletem danych kontaktowych, ale bez nazwy i NIP-u. */
const COMPANY = {
    id: 'studio-1',
    name: '',
    taxId: '',
    regon: '123456785',
    street: 'Długa 1',
    postalCode: '00-001',
    city: 'Warszawa',
    phone: '+48 500 100 200',
    email: 'biuro@studio.pl',
    website: null,
    bankAccount: null,
    logoUrl: null,
    logoNeedsLightPlate: false,
    logoAspectRatio: null,
    emailAlias: null,
    updatedAt: '2026-10-16T08:00:00Z',
} satisfies CompanySettings;

const renderPrompt = (company: CompanySettings | undefined) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <SellerPrompt company={company} />
            </ThemeProvider>
        </QueryClientProvider>,
    );

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const savedPayload = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz dane firmy' }));
    await waitFor(() => expect(updateCompanySettings).toHaveBeenCalledOnce());
    // Tak, jak pole pojedzie w JSON-ie: undefined znika, backend zostawia pole bez zmian.
    return JSON.parse(JSON.stringify(updateCompanySettings.mock.calls[0][0])) as Record<string, unknown>;
};

describe('SellerPrompt: zapis tylko tego, co wpisano', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCompanySettings.mockResolvedValue(COMPANY);
        updateCompanySettings.mockResolvedValue({ ...COMPANY, name: 'Detailing Studio', taxId: '5271234567' });
    });
    afterEach(cleanup);

    it('sama nazwa i NIP: w zapisie nie ma telefonu, e-maila, REGON-u ani adresu', async () => {
        renderPrompt(COMPANY);
        await screen.findByLabelText('Nazwa firmy *');

        fill('Nazwa firmy *', 'Detailing Studio');
        fill('NIP *', '5271234567');

        expect(await savedPayload()).toEqual({ name: 'Detailing Studio', taxId: '5271234567' });
        const sent = updateCompanySettings.mock.calls[0][0];
        expect(sent).not.toHaveProperty('phone');
        expect(sent).not.toHaveProperty('email');
        expect(sent).not.toHaveProperty('regon');
    });

    it('zmieniona ulica jedzie w zapisie, nieruszone kod i miasto nie', async () => {
        renderPrompt(COMPANY);
        await screen.findByLabelText('Nazwa firmy *');

        fill('Nazwa firmy *', 'Detailing Studio');
        fill('NIP *', '5271234567');
        fill('Ulica i numer', 'Krótka 2');

        expect(await savedPayload()).toEqual({ name: 'Detailing Studio', taxId: '5271234567', street: 'Krótka 2' });
    });

    it('wpisany kod i miejscowość jadą razem, bez reszty ustawień', async () => {
        renderPrompt(COMPANY);
        await screen.findByLabelText('Nazwa firmy *');

        fill('Nazwa firmy *', 'Detailing Studio');
        fill('NIP *', '5271234567');
        fill('Kod pocztowy i miejscowość', '30-001 Kraków');

        expect(await savedPayload()).toEqual({
            name: 'Detailing Studio',
            taxId: '5271234567',
            postalCode: '30-001',
            city: 'Kraków',
        });
    });

    it('nieudany odczyt ustawień: zamiast formularza komunikat, więc nic nie nadpisze się pustym', async () => {
        getCompanySettings.mockRejectedValue({ response: { status: 500 } });
        renderPrompt(undefined);

        expect(await screen.findByText('Nie udało się wczytać danych Twojej firmy')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Zapisz dane firmy' })).toBeNull();
        expect(updateCompanySettings).not.toHaveBeenCalled();
    });
});
