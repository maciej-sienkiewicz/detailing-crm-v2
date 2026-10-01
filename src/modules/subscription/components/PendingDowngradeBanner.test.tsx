// @vitest-environment jsdom
//
// Odwołanie zaplanowanego obniżenia planu: 409 (kolejny okres opłacony po niższej
// cenie) i 404 (nic już nie czeka) to nieaktualny baner, nie awaria - toast z tytułem
// mówi, co się stało, a dane planu są odświeżane także po błędzie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { PendingDowngradeBanner } from './PendingDowngradeBanner';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { MY_PLAN_KEY } from '../api/subscriptionQueries';
import type { PendingDowngrade } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { cancelPendingPlanChange: vi.fn() },
}));

const downgrade = (overrides: Partial<PendingDowngrade> = {}): PendingDowngrade => ({
    toPlanKey: 'BASIC',
    toPlanName: 'Basic',
    effectiveAt: '2026-10-20T10:00:00Z',
    cancellable: true,
    ...overrides,
});

let invalidate: ReturnType<typeof vi.spyOn>;

const renderBanner = (pendingDowngrade: PendingDowngrade = downgrade()) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <PendingDowngradeBanner pendingDowngrade={pendingDowngrade} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const myPlanInvalidated = () =>
    invalidate.mock.calls.some((call: unknown[]) =>
        JSON.stringify((call[0] as { queryKey?: unknown } | undefined)?.queryKey) === JSON.stringify(MY_PLAN_KEY));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PendingDowngradeBanner', () => {
    it('odwołanie się udaje: toast i odświeżone dane planu', async () => {
        vi.mocked(newSubscriptionApi.cancelPendingPlanChange).mockResolvedValue();
        renderBanner();
        await userEvent.click(screen.getByRole('button', { name: 'Odwołaj zmianę' }));

        expect(await screen.findByText('Zmiana odwołana')).toBeTruthy();
        expect(myPlanInvalidated()).toBe(true);
    });

    it('409 DOWNGRADE_ALREADY_PAID: toast z tytułem i wyjaśnieniem, dane planu odświeżone', async () => {
        vi.mocked(newSubscriptionApi.cancelPendingPlanChange).mockRejectedValue({
            response: {
                status: 409,
                data: { code: 'DOWNGRADE_ALREADY_PAID', message: 'Kolejny okres opłacono w planie Basic. Do planu Full wrócisz przez zmianę planu.' },
            },
            config: { skipErrorToast: true },
        });
        renderBanner();
        await userEvent.click(screen.getByRole('button', { name: 'Odwołaj zmianę' }));

        expect(await screen.findByText('Za późno na odwołanie')).toBeTruthy();
        expect(screen.getByText(/Do planu Full wrócisz przez zmianę planu/)).toBeTruthy();
        await waitFor(() => expect(myPlanInvalidated()).toBe(true));
        expect(screen.queryByText('Nie udało się odwołać zmiany')).toBeNull();
    });

    it('404: „nie ma już zaplanowanej zmiany", dane planu odświeżone', async () => {
        vi.mocked(newSubscriptionApi.cancelPendingPlanChange).mockRejectedValue({
            response: { status: 404, data: { message: 'Not found' } },
            config: { skipErrorToast: true },
        });
        renderBanner();
        await userEvent.click(screen.getByRole('button', { name: 'Odwołaj zmianę' }));

        expect(await screen.findByText('Nie ma już zaplanowanej zmiany')).toBeTruthy();
        await waitFor(() => expect(myPlanInvalidated()).toBe(true));
    });

    it('kolejny okres już opłacony (cancellable: false): bez przycisku, z wyjaśnieniem', () => {
        renderBanner(downgrade({ cancellable: false }));

        expect(screen.queryByRole('button', { name: 'Odwołaj zmianę' })).toBeNull();
        expect(screen.getByText(/nie da się\s+odwołać/)).toBeTruthy();
        expect(screen.getByText(/wrócisz później przez zmianę planu/)).toBeTruthy();
    });
});
