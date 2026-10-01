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
import { AddOnActivationDialog } from './PlanChangeDialog';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { subscriptionApi, type SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import type { AddOnPreview } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { checkout: vi.fn() },
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

    it('nieudana wycena: powód z backendu w oknie', async () => {
        renderDialog({ preview: null, previewError: 'Moduł jest już aktywny' });
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Nie udało się pobrać wyceny')).toBeTruthy();
        expect(within(dialog).getByText('Moduł jest już aktywny')).toBeTruthy();
    });
});
