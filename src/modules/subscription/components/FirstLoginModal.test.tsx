// @vitest-environment jsdom
//
// Okno pierwszego logowania: jedno wypełnienie (CLAUDE.md §2). Plan polecany był
// wypełniony gradientem marki, a plakietki „Polecany" i „Gratis" - nasyconym kolorem;
// po otwarciu własnego pakietu dochodził wypełniony „Przejdź do płatności". Trzy,
// cztery nasycone bloki i żadnego zwycięzcy - a zakup FULL wyglądał na krok następny,
// choć obok stoi bezpłatny okres próbny. Błąd zamówienia jest ogłaszany (role="alert").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { FirstLoginModal } from './FirstLoginModal';
import { newSubscriptionApi } from '../api/subscriptionApi';

const logout = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/modules/auth', () => ({
    useLogout: () => ({ mutate: logout.mutate, isPending: false }),
}));

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: {
        getFeaturePlans: vi.fn(),
        getAddOns: vi.fn(),
        calculatePrice: vi.fn(),
        startTrial: vi.fn(),
        checkout: vi.fn(),
    },
}));

const renderModal = (trialUsed = false) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <FirstLoginModal trialUsed={trialUsed} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

/** Wypełnienie = białe pismo na nasyconym tle; tak wygląda każdy wypełniony klocek. */
const WHITE = /^(#fff(fff)?|white|rgb\(255,\s*255,\s*255\))$/i;
const isFilled = (el: Element) => WHITE.test(getComputedStyle(el).color.trim());

/** Karta okna (bez kontenera toastów). */
const modalCard = () => screen.getByText('Witaj w DetailBoost!').closest('div')!.parentElement!;

/** Przyciski, odnośniki i plakietki okna, które są wypełnione. */
const filledControls = () => {
    const controls = Array.from(modalCard().querySelectorAll('button, a'));
    const pills = [screen.queryByText('Polecany'), screen.queryByText('Gratis')].filter((el): el is HTMLElement => !!el);
    return [...controls, ...pills].filter(isFilled);
};

beforeEach(() => {
    vi.mocked(newSubscriptionApi.getFeaturePlans).mockResolvedValue([
        { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 9900, features: [], displayOrder: 1 },
        { key: 'FULL', name: 'Full', monthlyPriceGrossCents: 29900, features: [], displayOrder: 2 },
    ]);
    vi.mocked(newSubscriptionApi.getAddOns).mockResolvedValue([
        { key: 'FINANCE_MODULE', name: 'Finanse', description: 'Faktury', monthlyPriceGrossCents: 6900, features: [], isAvailable: true },
    ]);
    vi.mocked(newSubscriptionApi.calculatePrice).mockResolvedValue({
        basePlanKey: 'BASIC', basePlanName: 'Basic', basePlanMonthlyPriceCents: 9900, addOns: [],
        totalMonthlyPriceCents: 9900, hasUndefinedPrices: false, fullPlanMonthlyPriceCents: 29900, savingsWithFullCents: null,
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('FirstLoginModal', () => {
    it('bez otwartego własnego pakietu nic nie jest wypełnione: plan polecany ma obwódkę, plakietki odcień', async () => {
        renderModal();
        await screen.findByText('Full');

        expect(screen.getByText('Polecany')).toBeTruthy();
        expect(screen.getByText('Gratis')).toBeTruthy();
        expect(filledControls()).toHaveLength(0);
        const fullPlan = screen.getByText('Full').closest('button')!;
        expect(getComputedStyle(fullPlan).backgroundImage ?? '').not.toMatch(/gradient/);
    });

    it('okno zasłania menu, więc samo daje „Wyloguj" - bez wypełnienia', async () => {
        renderModal();
        await screen.findByText('Full');

        const button = screen.getByRole('button', { name: 'Wyloguj' });
        expect(filledControls()).not.toContain(button);
        await userEvent.click(button);
        expect(logout.mutate).toHaveBeenCalledTimes(1);
    });

    it('otwarty własny pakiet: dokładnie jedno wypełnienie - „Przejdź do płatności"', async () => {
        renderModal();
        await userEvent.click(await screen.findByRole('button', { name: /Zbuduj własny pakiet/ }));
        await screen.findByText('Wybierz składniki pakietu');

        const filled = filledControls();
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toBe('Przejdź do płatności');
        expect(document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]')).toHaveLength(1);
    });

    it('nieudane zamówienie: błąd w oknie ogłaszany przez role="alert"', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockRejectedValue({
            response: { status: 503, data: { code: 'PAYMENTS_UNAVAILABLE' } },
            config: { skipErrorToast: true },
        });
        renderModal(true);
        await userEvent.click((await screen.findByText('Full')).closest('button')!);

        const alert = await within(modalCard()).findByRole('alert');
        expect(alert.textContent).toMatch(/Spróbuj ponownie za kilka minut\. Nic nie zostało pobrane\./);
    });
});
