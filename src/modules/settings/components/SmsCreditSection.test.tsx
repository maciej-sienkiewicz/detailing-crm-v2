// @vitest-environment jsdom
//
// „Kup wybrany pakiet" kupował od razu - jedno kliknięcie obciążało kartę studia bez
// pytania o kwotę. Te testy pilnują, że zakup przechodzi przez okno potwierdzenia,
// że okno pokazuje brutto z cennika co do grosza (a nie odtworzone z netta), i że
// porażka płatności jest widoczna.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SmsCreditSection } from './SmsCreditSection';
import { smsCreditApi } from '../api/smsCreditApi';
import { packagePrice, pricePerSmsLabel } from './smsCreditPricing';

vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: true }),
}));

const permissions = { isOwner: true };
vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ ...permissions, can: () => true, defaultRoute: '/' }),
}));

const assignSafeUrl = vi.fn();
vi.mock('@/common/utils/safeUrl', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/utils/safeUrl')>()),
    assignSafeUrl: (url: string) => assignSafeUrl(url),
}));

vi.mock('../api/smsCreditApi', () => ({
    smsCreditApi: {
        getBalance: vi.fn(),
        getPackages: vi.fn(),
        getTransactions: vi.fn(),
        purchaseCredits: vi.fn(),
    },
}));

// Kwoty jak z backendu: priceGross to BigDecimal w ZŁOTYCH.
const PACKAGES = [
    { id: 'k1', name: 'Start', creditAmount: 500, priceGross: 73.8, currency: 'PLN', pricePerCredit: 0.1476 },
    { id: 'k2', name: 'Studio', creditAmount: 2000, priceGross: 246, currency: 'PLN', pricePerCredit: 0.123 },
];

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <SmsCreditSection />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

beforeEach(() => {
    permissions.isOwner = true;
    vi.mocked(smsCreditApi.getBalance).mockResolvedValue({
        availableCredits: 1240, totalPurchased: 3000, totalUsed: 1760, updatedAt: '2026-09-20T10:00:00Z',
    });
    vi.mocked(smsCreditApi.getPackages).mockResolvedValue(PACKAGES);
    vi.mocked(smsCreditApi.getTransactions).mockResolvedValue({ items: [], page: { number: 1, size: 20, totalItems: 0, totalPages: 1 } });
    // Tryb mock backendu: zamówienie zrealizowane od razu, bez strony płatności.
    vi.mocked(smsCreditApi.purchaseCredits).mockResolvedValue({
        orderId: 'o1', status: 'FULFILLED', amountCents: 24600, currency: 'PLN',
        description: 'Pakiet Studio, 2000 kredytów SMS', paymentUrl: null,
    });
    sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const normalize = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

describe('smsCreditPricing', () => {
    it('brutto z cennika zostaje co do grosza, netto jest pochodne, VAT to różnica', () => {
        const price = packagePrice({ priceGross: 246 });
        expect(price).toEqual({ grossCents: 24600, netCents: 20000, vatCents: 4600, vatRate: 23 });
    });

    it('kwota brutto nieosiągalna z netta (1900,00 zł) nie pływa', () => {
        // 190000 gr → netto 154472 gr; odtworzenie brutto z netta dałoby 190001.
        const price = packagePrice({ priceGross: 1900 });
        expect(price.grossCents).toBe(190000);
        expect(price.netCents + price.vatCents).toBe(190000);
    });

    it('złotówki z BigDecimal zamieniają się na grosze bez szumu zmiennoprzecinkowego', () => {
        expect(packagePrice({ priceGross: 149.99 }).grossCents).toBe(14999);
        expect(packagePrice({ priceGross: 0.3 }).grossCents).toBe(30);
    });

    it('cena za SMS w groszach', () => {
        expect(normalize(pricePerSmsLabel(PACKAGES[1]))).toBe('12,30 gr za SMS');
    });
});

describe('SmsCreditSection', () => {
    it('saldo jest nagłówkiem karty, bez powtórzonego tytułu sekcji', async () => {
        renderSection();
        expect(await screen.findByText('Na koncie')).toBeTruthy();
        // „łącznie dodano", nie „kupiono": suma obejmuje kredyty startowe, których nikt nie kupił.
        expect(await screen.findByText(/łącznie dodano 3000, zużyto 1760/)).toBeTruthy();
        expect(screen.queryByText(/Saldo kredytów SMS/)).toBeNull();
    });

    it('przycisk mówi, co i za ile kupisz, a kliknięcie NIE kupuje od razu', async () => {
        renderSection();
        const buy = await screen.findByRole('button', { name: 'Wybierz pakiet' });
        expect(buy).toBeDisabled();

        await userEvent.click(screen.getByRole('radio', { name: /Studio, 2000 kredytów/ }));
        const named = screen.getByRole('button', { name: /^Kup 2000 kredytów za 246,00/ });
        await userEvent.click(named);

        expect(smsCreditApi.purchaseCredits).not.toHaveBeenCalled();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/Kupić 2000 kredytów SMS\?/)).toBeTruthy();
    });

    it('okno potwierdzenia rozpisuje netto, VAT (różnica) i brutto z cennika', async () => {
        renderSection();
        await userEvent.click(await screen.findByRole('radio', { name: /Studio/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Kup 2000/ }));

        const dialog = await screen.findByRole('dialog');
        const text = normalize(dialog.textContent);
        expect(text).toContain('Studio, 2000 kredytów');
        expect(text).toContain('Netto200,00 zł');
        expect(text).toContain('VAT 23%46,00 zł');
        expect(text).toContain('246,00 zł brutto');
        expect(text).toContain('Po zakupie na koncie będzie 3240 kredytów.');
    });

    it('„Kup za …" kupuje wybrany pakiet i mówi o tym toastem', async () => {
        renderSection();
        await userEvent.click(await screen.findByRole('radio', { name: /Studio/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Kup 2000/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Kup za 246,00/ }));

        await waitFor(() => expect(smsCreditApi.purchaseCredits).toHaveBeenCalledWith('k2'));
        expect(await screen.findByText('Kredyty dodane')).toBeTruthy();
        expect(assignSafeUrl).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    // Zakup idzie przez Przelewy24 jak abonament: przekierowanie na stronę płatności,
    // a strona wyniku po powrocie odsyła z powrotem do sekcji kredytów.
    it('„Kup za …" prowadzi do Przelewy24 i zapamiętuje powrót do sekcji kredytów', async () => {
        vi.mocked(smsCreditApi.purchaseCredits).mockResolvedValue({
            orderId: 'o2', status: 'PENDING', amountCents: 24600, currency: 'PLN',
            description: 'Pakiet Studio, 2000 kredytów SMS',
            paymentUrl: 'https://sandbox.przelewy24.pl/trnRequest/TOKEN',
        });
        renderSection();
        await userEvent.click(await screen.findByRole('radio', { name: /Studio/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Kup 2000/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Kup za 246,00/ }));

        await waitFor(() => expect(assignSafeUrl).toHaveBeenCalledWith('https://sandbox.przelewy24.pl/trnRequest/TOKEN'));
        expect(sessionStorage.getItem('payment-return:o2')).toBe('/settings?tab=credits');
        expect(screen.queryByText('Kredyty dodane')).toBeNull();
    });

    it('bez zgody na regulamin pakiet nie jest kupowany', async () => {
        renderSection();
        await userEvent.click(await screen.findByRole('radio', { name: /Studio/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Kup 2000/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Kup za 246,00/ }));

        expect(await screen.findByText(/Zaznacz akceptację regulaminu/)).toBeTruthy();
        expect(smsCreditApi.purchaseCredits).not.toHaveBeenCalled();
    });

    it('odrzucona płatność: toast z powodem, okno zostaje otwarte', async () => {
        vi.mocked(smsCreditApi.purchaseCredits).mockRejectedValue({
            response: { status: 400, data: { message: 'Płatność nie powiodła się: karta odrzucona' } },
            config: { skipErrorToast: true },
        });
        renderSection();
        await userEvent.click(await screen.findByRole('radio', { name: /Start/ }));
        await userEvent.click(screen.getByRole('button', { name: /^Kup 500/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Kup za 73,80/ }));

        expect(await screen.findByText('Zakup się nie udał')).toBeTruthy();
        expect(screen.getByText(/karta odrzucona/)).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('błąd salda to komunikat z ponowieniem, nie pusta karta', async () => {
        vi.mocked(smsCreditApi.getBalance).mockRejectedValue(new Error('offline'));
        renderSection();
        expect(await screen.findByText('Nie udało się wczytać salda')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
    });

    // Zakup bez podpiętej bramki kończył się dopiero na końcu błędem 503, po wyborze pakietu
    // i zaznaczeniu zgody. Teraz zamiast „Kup" jest mail do obsługi z wybranym pakietem.
    it('zakup online niedostępny: zamiast „Kup" mail do obsługi z wybranym pakietem', async () => {
        vi.mocked(smsCreditApi.getBalance).mockResolvedValue({
            availableCredits: 0, totalPurchased: 150, totalUsed: 150, updatedAt: '2026-09-20T10:00:00Z',
            onlinePurchaseAvailable: false,
        });
        renderSection();
        expect(await screen.findByText('Kredytów nie kupisz jeszcze w aplikacji')).toBeTruthy();

        await userEvent.click(await screen.findByRole('radio', { name: /Studio, 2000 kredytów/ }));
        expect(screen.queryByRole('button', { name: /^Kup/ })).toBeNull();
        const link = screen.getByRole('link', { name: 'Napisz do nas o 2000 kredytów' });
        const href = decodeURIComponent(link.getAttribute('href') ?? '');
        expect(href).toMatch(/^mailto:pomoc@detailboost\.pl\?/);
        expect(normalize(href)).toContain('pakiet Studio, 2000 kredytów za 246,00 zł brutto');

        await userEvent.click(link);
        expect(smsCreditApi.purchaseCredits).not.toHaveBeenCalled();
    });

    it('wysyłka w historii ma rodzaj „Wysyłka" (backend wysyła DEDUCTION)', async () => {
        vi.mocked(smsCreditApi.getTransactions).mockResolvedValue({
            items: [{
                id: 't1', type: 'DEDUCTION', amount: -1, balanceAfter: 1239,
                description: 'Wysłanie SMS', referenceId: null, createdAt: '2026-09-20T10:00:00Z',
            }],
            page: { number: 1, size: 20, totalItems: 1, totalPages: 1 },
        });
        renderSection();
        expect(await screen.findByText('Wysyłka')).toBeTruthy();
    });

    it('poza właścicielem nie pyta o pakiety ani historię (backend odpowiedziałby 403)', async () => {
        permissions.isOwner = false;
        renderSection();
        expect(await screen.findByText('Na koncie')).toBeTruthy();
        expect(smsCreditApi.getPackages).not.toHaveBeenCalled();
        expect(smsCreditApi.getTransactions).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: /Kup|Wybierz pakiet/ })).toBeNull();
    });
});
