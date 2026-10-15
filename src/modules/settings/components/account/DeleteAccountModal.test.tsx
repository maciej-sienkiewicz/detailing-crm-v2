// @vitest-environment jsdom
//
// „Usuń konto" kasuje firmę na zawsze. Testy pilnują, że przycisk odblokowuje dopiero
// nazwa firmy z hasłem, że telefon z aplikacją odpina się, póki sesja jeszcze żyje,
// i że błąd z serwera (złe hasło) zostaje przy formularzu.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { DeleteAccountModal } from './DeleteAccountModal';
import { accountResetApi } from '../../api/accountResetApi';
import { companyApi } from '../../api/companyApi';
import { detachNativePush } from '@/modules/push/native/nativePush';

vi.mock('../../api/accountResetApi', () => ({
    accountResetApi: { deleteAccount: vi.fn() },
}));

vi.mock('../../api/companyApi', () => ({
    companyApi: { getCompanySettings: vi.fn() },
}));

vi.mock('@/modules/push/native/nativePush', () => ({
    detachNativePush: vi.fn(),
}));

const COMPANY_NAME = 'Auto Spa Kraków';

const renderModal = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <DeleteAccountModal isOpen onClose={vi.fn()} />
            </ThemeProvider>
        </QueryClientProvider>
    );
};

const deleteButton = () => screen.getByRole('button', { name: /usuń konto na zawsze/i });

const fillForm = async (name = COMPANY_NAME, password = 'moje-haslo') => {
    await screen.findByText(new RegExp(COMPANY_NAME));
    await userEvent.type(screen.getByLabelText(/przepisz nazwę firmy/i), name);
    await userEvent.type(screen.getByLabelText(/twoje hasło/i), password);
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(companyApi.getCompanySettings).mockResolvedValue({
        id: '1',
        name: COMPANY_NAME,
    } as Awaited<ReturnType<typeof companyApi.getCompanySettings>>);
    vi.mocked(detachNativePush).mockResolvedValue();
});

describe('DeleteAccountModal', () => {
    it('zła nazwa firmy nie odblokowuje usunięcia', async () => {
        renderModal();
        await fillForm('Inna Firma');
        expect(deleteButton()).toBeDisabled();
    });

    it('usuwa konto, odpinając wcześniej telefon, i mówi, co dalej', async () => {
        vi.mocked(accountResetApi.deleteAccount).mockResolvedValue();
        renderModal();
        await fillForm();

        await userEvent.click(deleteButton());

        expect(await screen.findByText('Konto usunięte')).toBeInTheDocument();
        expect(accountResetApi.deleteAccount).toHaveBeenCalledWith({
            currentPassword: 'moje-haslo',
            confirmationName: COMPANY_NAME,
        });
        expect(vi.mocked(detachNativePush).mock.invocationCallOrder[0])
            .toBeLessThan(vi.mocked(accountResetApi.deleteAccount).mock.invocationCallOrder[0]);
    });

    it('błąd z serwera zostaje przy formularzu', async () => {
        vi.mocked(accountResetApi.deleteAccount).mockRejectedValue({
            response: { data: { message: 'Nieprawidłowe hasło' } },
        });
        renderModal();
        await fillForm();

        await userEvent.click(deleteButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('Nieprawidłowe hasło');
        expect(deleteButton()).toBeEnabled();
    });
});
