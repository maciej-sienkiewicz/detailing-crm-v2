// @vitest-environment jsdom
//
// Okno zakupu modułu otwierane z paywalla i upsellu - ekranów, które o abonamencie
// nic nie wiedzą. Po końcu opłaconego okresu zamiast „Przejdź do płatności" (backend
// i tak odrzuci zakup) prowadzi do przedłużenia; błąd zamówienia zostaje w oknie.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { AddOnActivationDialog, PlanChangeDialog } from './PlanChangeDialog';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { subscriptionApi, type SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import type { AddOnPreview, PlanChangePreview } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { checkout: vi.fn(), changePlan: vi.fn() },
}));

vi.mock('@/modules/settings/api/subscriptionApi', () => ({
    subscriptionApi: { getStatus: vi.fn() },
}));

const status = (overrides: Partial<SubscriptionStatusResponse> = {}): SubscriptionStatusResponse => ({
    status: 'ACTIVE',
    isAccessible: true,
    daysRemaining: 19,
    subscriptionEndsAt: '2026-10-20T10:00:00Z',
    trialEndsAt: null,
    trialUsed: true,
    graceEndsAt: null,
    inGrace: false,
    ...overrides,
});

const preview: AddOnPreview = {
    addOnKey: 'FINANCE_MODULE',
    addOnName: 'Finanse',
    proratedAmountCents: 5000,
    proratedAmountFormatted: '50,00 zł',
    daysRemaining: 19,
    periodEndsAt: '2026-10-20T10:00:00Z',
    explanation: 'Dopłata za resztę okresu.',
};

const onClose = vi.fn();

const renderDialog = (overrides: Partial<Parameters<typeof AddOnActivationDialog>[0]> = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <AddOnActivationDialog
                        addOnKey="FINANCE_MODULE"
                        addOnName="Finanse"
                        preview={preview}
                        isLoadingPreview={false}
                        onClose={onClose}
                        {...overrides}
                    />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const renderPlanDialog = (planPreview: PlanChangePreview | null, newPlan: { key: 'BASIC' | 'FULL'; name: string } = { key: 'FULL', name: 'Full' }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <PlanChangeDialog
                        newPlanKey={newPlan.key}
                        newPlanName={newPlan.name}
                        currentPlanName="Basic"
                        preview={planPreview}
                        isLoadingPreview={false}
                        onClose={onClose}
                    />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const filledIn = (root: HTMLElement) => root.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

beforeEach(() => {
    vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status());
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('AddOnActivationDialog', () => {
    it('karencja: „najpierw opłać przedłużenie" i odnośnik do Abonamentu zamiast płatności', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({
            status: 'PAST_DUE', inGrace: true, graceEndsAt: '2026-10-05T10:00:00Z',
        }));
        renderDialog();
        const dialog = await screen.findByRole('dialog');

        expect(await within(dialog).findByText('Najpierw opłać przedłużenie')).toBeTruthy();
        expect(within(dialog).queryByRole('button', { name: 'Przejdź do płatności' })).toBeNull();
        const link = within(dialog).getByRole('link', { name: 'Przejdź do abonamentu' });
        expect(link.getAttribute('href')).toBe('/settings?tab=plan');
        expect(filledIn(dialog)).toHaveLength(1);
        expect(newSubscriptionApi.checkout).not.toHaveBeenCalled();
    });

    it('wygasły abonament: to samo, zakupu nie da się zacząć', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderDialog();
        expect(await screen.findByText('Najpierw opłać przedłużenie')).toBeTruthy();
    });

    it('503 PAYMENTS_UNAVAILABLE: komunikat w oknie, okno zostaje otwarte', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockRejectedValue({
            response: { status: 503, data: { code: 'PAYMENTS_UNAVAILABLE' } },
            config: { skipErrorToast: true },
        });
        renderDialog();
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());

        await userEvent.click(within(dialog).getByRole('button', { name: 'Przejdź do płatności' }));
        expect(await within(dialog).findByText('Płatności są chwilowo niedostępne')).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('FULFILLED bez adresu płatności (okres próbny): sukces i zamknięcie', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
            orderId: 'o1', status: 'FULFILLED', amountCents: 0, currency: 'PLN', description: '', paymentUrl: null,
        });
        renderDialog({ preview: { ...preview, proratedAmountCents: null, proratedAmountFormatted: null } });
        const dialog = await screen.findByRole('dialog');

        await userEvent.click(within(dialog).getByRole('button', { name: 'Aktywuj bezpłatnie' }));
        expect(await screen.findByText('Moduł aktywowany')).toBeTruthy();
        expect(onClose).toHaveBeenCalled();
    });

    it('wycena z allowed: false to NIE okres próbny: wyjaśnienie backendu zamiast „Aktywuj bezpłatnie"', async () => {
        // Status jeszcze się nie wczytał (albo pokazuje trwający okres), a backend już wie,
        // że zakupu nie przyjmie - wycena odmowy też nie ma kwoty.
        vi.mocked(subscriptionApi.getStatus).mockReturnValue(new Promise(() => {}));
        renderDialog({
            preview: {
                ...preview, proratedAmountCents: null, proratedAmountFormatted: null, allowed: false,
                explanation: 'Okres rozliczeniowy nie trwa - najpierw opłać przedłużenie subskrypcji.',
            },
        });
        const dialog = await screen.findByRole('dialog');

        expect(within(dialog).getByText('Okres rozliczeniowy nie trwa - najpierw opłać przedłużenie subskrypcji.')).toBeTruthy();
        expect(within(dialog).queryByText(/Aktywuj bezpłatnie/)).toBeNull();
        expect(within(dialog).queryByText(/okresu próbnego/)).toBeNull();
        expect(within(dialog).queryByRole('button', { name: 'Przejdź do płatności' })).toBeNull();
        expect(within(dialog).getByRole('link', { name: 'Przejdź do abonamentu' }).getAttribute('href')).toBe('/settings?tab=plan');
        expect(filledIn(dialog)).toHaveLength(1);
    });

    it('moduł w przygotowaniu (allowed: false) nie uruchamia przewodnika ani zakupu', async () => {
        renderDialog({
            addOnKey: 'CLIENT_COMMUNICATION',
            addOnName: 'Komunikacja',
            preview: {
                ...preview, addOnKey: 'CLIENT_COMMUNICATION', addOnName: 'Komunikacja',
                proratedAmountCents: null, proratedAmountFormatted: null, allowed: false,
                explanation: 'Ten moduł jest jeszcze w przygotowaniu i nie można go aktywować.',
            },
        });
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Ten moduł jest jeszcze w przygotowaniu i nie można go aktywować.')).toBeTruthy();
        expect(within(dialog).queryByText(/Aktywuj bezpłatnie/)).toBeNull();
    });

    it('409 CHECKOUT_IN_PROGRESS: zdanie backendu w oknie, z tytułem „przygotowywana", nie „nie udało się"', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockRejectedValue({
            response: { status: 409, data: { code: 'CHECKOUT_IN_PROGRESS', message: 'Płatność za ten zakup jest właśnie przygotowywana. Spróbuj ponownie za chwilę.' } },
            config: { skipErrorToast: true },
        });
        renderDialog();
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());

        await userEvent.click(within(dialog).getByRole('button', { name: 'Przejdź do płatności' }));
        expect(await within(dialog).findByText('Płatność jest już przygotowywana')).toBeTruthy();
        expect(within(dialog).getByText('Płatność za ten zakup jest właśnie przygotowywana. Spróbuj ponownie za chwilę.')).toBeTruthy();
        expect(within(dialog).queryByText('Nie udało się aktywować modułu')).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('darmowe zamówienie CANCELLED (efektu nie dało się wprowadzić): porażka, „nic nie zostało pobrane"', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
            orderId: 'o1', status: 'CANCELLED', amountCents: 0, currency: 'PLN', description: '', paymentUrl: null,
        });
        renderDialog({ preview: { ...preview, proratedAmountCents: null, proratedAmountFormatted: null } });
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());

        await userEvent.click(within(dialog).getByRole('button', { name: 'Aktywuj bezpłatnie' }));
        expect(await within(dialog).findByText('Nie udało się wprowadzić zakupu')).toBeTruthy();
        expect(within(dialog).getByText(/Nic nie zostało pobrane/)).toBeTruthy();
        expect(screen.queryByText('Moduł aktywowany')).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('zmieniona kwota przy wycenie bez opłaty: „Wycena nie przewidywała opłaty", nie „pokazywała Bezpłatnie"', async () => {
        const assign = vi.fn();
        const originalLocation = window.location;
        Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } });
        try {
            vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
                orderId: 'o1', status: 'PENDING', amountCents: 3100, currency: 'PLN', description: '',
                paymentUrl: 'https://sandbox.przelewy24.pl/trnRequest/abc',
            });
            renderDialog({ preview: { ...preview, proratedAmountCents: null, proratedAmountFormatted: null } });
            const dialog = await screen.findByRole('dialog');
            await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());

            await userEvent.click(within(dialog).getByRole('button', { name: 'Aktywuj bezpłatnie' }));
            const notice = await within(dialog).findByRole('alert');
            expect(notice.textContent).toMatch(/Wycena nie przewidywała opłaty\./);
            expect(notice.textContent).not.toMatch(/Bezpłatnie/);
            expect(notice.textContent).not.toMatch(/rozpoczętej już wcześniej/);
            expect(assign).not.toHaveBeenCalled();
        } finally {
            Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
        }
    });

    it('nieudana wycena: powód z backendu w oknie', async () => {
        renderDialog({ preview: null, previewError: 'Moduł jest już aktywny' });
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Nie udało się pobrać wyceny')).toBeTruthy();
        expect(within(dialog).getByText('Moduł jest już aktywny')).toBeTruthy();
    });
});

describe('PlanChangeDialog', () => {
    const upgrade: PlanChangePreview = {
        changeType: 'UPGRADE', newPlanKey: 'FULL', newPlanName: 'Full', effectiveAt: '2026-10-01T10:00:00Z',
        proratedAmountCents: 9000, proratedAmountFormatted: '90,00 zł', daysRemaining: 19,
        periodEndsAt: '2026-10-20T10:00:00Z', explanation: 'Dopłata za resztę okresu.',
    };

    it('wycena z allowed: false: wyjaśnienie backendu i odnośnik, nigdy „Bezpłatnie w ramach okresu próbnego"', async () => {
        renderPlanDialog({
            ...upgrade, proratedAmountCents: null, proratedAmountFormatted: null, allowed: false,
            explanation: 'Okres rozliczeniowy nie trwa - najpierw opłać przedłużenie subskrypcji.',
        });
        const dialog = await screen.findByRole('dialog');

        expect(within(dialog).getByText('Okres rozliczeniowy nie trwa - najpierw opłać przedłużenie subskrypcji.')).toBeTruthy();
        expect(within(dialog).queryByText(/okresu próbnego/)).toBeNull();
        expect(within(dialog).queryByRole('button', { name: 'Przejdź do płatności' })).toBeNull();
        expect(within(dialog).getByRole('link', { name: 'Przejdź do abonamentu' })).toBeTruthy();
        expect(filledIn(dialog)).toHaveLength(1);
    });

    it('409 DOWNGRADE_ALREADY_PAID przy ponownym planowaniu obniżenia: ostrzeżenie z powodem, okno się zamyka', async () => {
        vi.mocked(newSubscriptionApi.changePlan).mockRejectedValue({
            response: { status: 409, data: { code: 'DOWNGRADE_ALREADY_PAID', message: 'Kolejny okres jest już opłacony w planie Basic, więc tej zmiany nie można odwołać ani przesunąć.' } },
            config: { skipErrorToast: true },
        });
        renderPlanDialog({
            changeType: 'DOWNGRADE', newPlanKey: 'BASIC', newPlanName: 'Basic', effectiveAt: '2026-10-20T10:00:00Z',
            proratedAmountCents: null, proratedAmountFormatted: null, daysRemaining: 19,
            periodEndsAt: '2026-10-20T10:00:00Z', explanation: 'Zmiana wejdzie w życie po zakończeniu okresu.',
        }, { key: 'BASIC', name: 'Basic' });
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(subscriptionApi.getStatus).toHaveBeenCalled());

        await userEvent.click(within(dialog).getByRole('button', { name: 'Zaplanuj zmianę' }));
        expect(await screen.findByText('Tej zmiany nie da się już przesunąć')).toBeTruthy();
        expect(screen.getByText(/nie można odwołać ani przesunąć/)).toBeTruthy();
        expect(screen.queryByText('Nie udało się zmienić planu')).toBeNull();
        expect(onClose).toHaveBeenCalled();
    });
});
