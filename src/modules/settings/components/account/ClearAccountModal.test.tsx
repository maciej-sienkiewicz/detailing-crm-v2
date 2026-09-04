// @vitest-environment jsdom
//
// „Wyczyść konto" to jedyny przycisk w aplikacji, który kasuje wszystko. Te testy
// pilnują dwóch rzeczy: że nie da się go nacisnąć przypadkiem (nazwa firmy + hasło
// odblokowują akcję dopiero razem) i że po starcie użytkownik widzi postęp,
// a nie formularz pozwalający zlecić reset drugi raz.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { ClearAccountModal } from './ClearAccountModal';
import { accountResetApi, type AccountResetJob } from '../../api/accountResetApi';
import { companyApi } from '../../api/companyApi';

vi.mock('../../api/accountResetApi', async importOriginal => {
    const original = await importOriginal<typeof import('../../api/accountResetApi')>();
    return {
        ...original,
        accountResetApi: {
            startReset: vi.fn(),
            getStatus: vi.fn(),
            getLatest: vi.fn(),
        },
    };
});

vi.mock('../../api/companyApi', () => ({
    companyApi: {
        getCompanySettings: vi.fn(),
    },
}));

const COMPANY_NAME = 'Auto Spa Kraków';

const job = (overrides: Partial<AccountResetJob> = {}): AccountResetJob => ({
    jobId: 'job-1',
    status: 'RUNNING',
    currentStep: 3,
    totalSteps: 25,
    currentStepName: 'Klienci',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ...overrides,
});

const renderModal = (onClose = vi.fn()) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <ClearAccountModal isOpen onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
    return { onClose };
};

const dangerButton = () => screen.getByRole('button', { name: /wyczyść konto bezpowrotnie/i });
const nameInput = () => screen.getByLabelText(/przepisz nazwę firmy/i);
const passwordInput = () => screen.getByLabelText(/twoje hasło/i);

beforeEach(() => {
    vi.mocked(companyApi.getCompanySettings).mockResolvedValue({
        id: '1',
        name: COMPANY_NAME,
    } as Awaited<ReturnType<typeof companyApi.getCompanySettings>>);
    vi.mocked(accountResetApi.getLatest).mockResolvedValue(null);
    vi.mocked(accountResetApi.getStatus).mockResolvedValue(job());
    vi.mocked(accountResetApi.startReset).mockResolvedValue(job({ status: 'PENDING', currentStep: 0 }));
});

describe('ClearAccountModal', () => {
    it('wylicza skutki i blokuje przycisk, dopóki nazwa i hasło nie są podane razem', async () => {
        renderModal();

        expect(await screen.findByText(/zostaną bezpowrotnie usunięte/i)).toBeInTheDocument();
        expect(screen.getByText(/zostaną zachowane/i)).toBeInTheDocument();
        expect(screen.getByText(/dokumenty księgowe/i)).toBeInTheDocument();
        expect(dangerButton()).toBeDisabled();

        // Samo hasło nie wystarcza.
        await userEvent.type(passwordInput(), 'moje-haslo');
        expect(dangerButton()).toBeDisabled();

        // Zła nazwa nie odblokowuje.
        await userEvent.type(nameInput(), 'Inna Firma');
        expect(dangerButton()).toBeDisabled();
    });

    it('poprawna nazwa firmy (z tolerancją spacji) i hasło odblokowują akcję', async () => {
        renderModal();
        await screen.findByText(/zostaną bezpowrotnie usunięte/i);

        await userEvent.type(nameInput(), `  ${COMPANY_NAME}  `);
        await userEvent.type(passwordInput(), 'moje-haslo');

        await waitFor(() => expect(dangerButton()).toBeEnabled());
    });

    it('wysyła zlecenie z przepisaną nazwą i domyślnie nie czyści danych firmy', async () => {
        renderModal();
        await screen.findByText(/zostaną bezpowrotnie usunięte/i);

        await userEvent.type(nameInput(), COMPANY_NAME);
        await userEvent.type(passwordInput(), 'moje-haslo');
        await userEvent.click(dangerButton());

        await waitFor(() =>
            expect(accountResetApi.startReset).toHaveBeenCalledWith({
                currentPassword: 'moje-haslo',
                confirmationName: COMPANY_NAME,
                wipeCompanyData: false,
            })
        );
    });

    it('checkbox „usuń też dane firmy" trafia do zlecenia', async () => {
        renderModal();
        await screen.findByText(/zostaną bezpowrotnie usunięte/i);

        await userEvent.click(screen.getByRole('checkbox'));
        await userEvent.type(nameInput(), COMPANY_NAME);
        await userEvent.type(passwordInput(), 'moje-haslo');
        await userEvent.click(dangerButton());

        await waitFor(() =>
            expect(accountResetApi.startReset).toHaveBeenCalledWith(
                expect.objectContaining({ wipeCompanyData: true })
            )
        );
    });

    it('błąd startu (np. złe hasło) pokazuje komunikat backendu przy formularzu', async () => {
        vi.mocked(accountResetApi.startReset).mockRejectedValue({
            response: { data: { message: 'Nieprawidłowe hasło' } },
        });
        renderModal();
        await screen.findByText(/zostaną bezpowrotnie usunięte/i);

        await userEvent.type(nameInput(), COMPANY_NAME);
        await userEvent.type(passwordInput(), 'zle-haslo');
        await userEvent.click(dangerButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('Nieprawidłowe hasło');
        // Formularz zostaje - użytkownik poprawia hasło, nie zaczyna od zera.
        expect(nameInput()).toHaveValue(COMPANY_NAME);
    });

    it('po starcie przechodzi w widok postępu bez możliwości zamknięcia', async () => {
        renderModal();
        await screen.findByText(/zostaną bezpowrotnie usunięte/i);

        await userEvent.type(nameInput(), COMPANY_NAME);
        await userEvent.type(passwordInput(), 'moje-haslo');
        await userEvent.click(dangerButton());

        expect(await screen.findByText(/trwa czyszczenie konta/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /zamknij/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /anuluj/i })).not.toBeInTheDocument();
        // Pokazujemy krok z nazwą - użytkownik widzi, że coś naprawdę się dzieje.
        expect(await screen.findByText(/Klienci/)).toBeInTheDocument();
    });

    it('aktywny job z poprzedniej sesji od razu otwiera widok postępu, nie formularz', async () => {
        vi.mocked(accountResetApi.getLatest).mockResolvedValue(job());
        renderModal();

        expect(await screen.findByText(/trwa czyszczenie konta/i)).toBeInTheDocument();
        expect(screen.queryByText(/zostaną bezpowrotnie usunięte/i)).not.toBeInTheDocument();
    });

    it('status FAILED pokazuje błąd i identyfikator operacji dla pomocy technicznej', async () => {
        vi.mocked(accountResetApi.getLatest).mockResolvedValue(job());
        vi.mocked(accountResetApi.getStatus).mockResolvedValue(
            job({ status: 'FAILED', error: 'Krok Instagram eksplodował' })
        );
        renderModal();

        expect(await screen.findByText(/nie powiodło się/i)).toBeInTheDocument();
        expect(screen.getByText(/Krok Instagram eksplodował/)).toBeInTheDocument();
        expect(screen.getByText(/job-1/)).toBeInTheDocument();
        // Krzyżyk w nagłówku i „Zamknij" w stopce - obie drogi wyjścia wracają po porażce.
        expect(screen.getAllByRole('button', { name: /zamknij/i }).length).toBeGreaterThan(0);
    });
});
