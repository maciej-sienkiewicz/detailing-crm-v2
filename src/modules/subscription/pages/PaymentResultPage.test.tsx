// @vitest-environment jsdom
//
// Powrót z Przelewy24: sukcesem jest dopiero FULFILLED (i dopiero wtedy odświeżamy
// dane abonamentu), PAID to „płatność przyjęta, aktywacja trwa", EXPIRED nie kończy
// odpytywania, a REFUND_REQUIRED nie może mówić „nic nie zostało pobrane".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { PaymentResultPage } from './PaymentResultPage';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { PaymentOrder, PaymentOrderStatus } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { getOrder: vi.fn() },
}));

const order = (status: PaymentOrderStatus, overrides: Partial<PaymentOrder> = {}): PaymentOrder => ({
    orderId: 'o1',
    type: 'ADD_ON_PURCHASE',
    typeDisplayName: 'Zakup modułu',
    status,
    amountCents: 4900,
    currency: 'PLN',
    description: 'Moduł Komunikacja',
    createdAt: '2026-10-01T10:00:00Z',
    paidAt: null,
    failureReason: null,
    ...overrides,
});

let queryClient: QueryClient;
let invalidate: ReturnType<typeof vi.spyOn>;

const renderPage = (search = '?orderId=o1') => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    return render(
        <MemoryRouter initialEntries={[`/payments/result${search}`]}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <PaymentResultPage />
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

/** Przesuwa zegar i pozwala dokończyć się odpowiedziom oraz renderom. */
const advance = async (ms: number) => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

const filledButtons = () => document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');

describe('PaymentResultPage', () => {
    it('PENDING → PAID → FULFILLED: dane abonamentu odświeżone dopiero przy FULFILLED', async () => {
        vi.mocked(newSubscriptionApi.getOrder)
            .mockResolvedValueOnce(order('PENDING'))
            .mockResolvedValueOnce(order('PAID'))
            .mockResolvedValueOnce(order('FULFILLED'));
        renderPage();

        await advance(0);
        expect(screen.getByText('Czekamy na potwierdzenie płatności')).toBeTruthy();
        expect(invalidate).not.toHaveBeenCalled();

        await advance(2500);
        expect(screen.getByText('Płatność przyjęta, aktywujemy zmiany')).toBeTruthy();
        // Aktywacja trwa: żadnego kroku do kliknięcia i jeszcze żadnego odświeżania.
        expect(filledButtons()).toHaveLength(0);
        expect(invalidate).not.toHaveBeenCalled();

        await advance(2500);
        expect(screen.getByText('Płatność zakończona, zmiany są aktywne')).toBeTruthy();
        expect(invalidate).toHaveBeenCalled();
        expect(filledButtons()).toHaveLength(1);

        // Koniec odpytywania.
        await advance(10_000);
        expect(newSubscriptionApi.getOrder).toHaveBeenCalledTimes(3);
    });

    it('EXPIRED nie kończy odpytywania - spóźniona wpłata przechodzi do PAID', async () => {
        vi.mocked(newSubscriptionApi.getOrder)
            .mockResolvedValueOnce(order('EXPIRED'))
            .mockResolvedValueOnce(order('PAID'));
        renderPage();

        await advance(0);
        expect(screen.getByText('Czekamy na potwierdzenie płatności')).toBeTruthy();
        expect(screen.queryByText(/nie powiodła się/)).toBeNull();

        await advance(2500);
        expect(screen.getByText('Płatność przyjęta, aktywujemy zmiany')).toBeTruthy();
        expect(newSubscriptionApi.getOrder).toHaveBeenCalledTimes(2);
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('REFUND_REQUIRED: pobrano pieniądze - zwrot przez wsparcie i powód, nigdy „nic nie pobrano"', async () => {
        vi.mocked(newSubscriptionApi.getOrder).mockResolvedValue(
            order('REFUND_REQUIRED', { failureReason: 'Moduł był już aktywny', paidAt: '2026-10-01T10:01:00Z' }),
        );
        renderPage();
        await advance(0);

        expect(screen.getByText('Płatność przyjęta, ale zakupu nie udało się wprowadzić')).toBeTruthy();
        expect(screen.getByText(/Zwrócimy pieniądze/)).toBeTruthy();
        expect(screen.getByText('Powód: Moduł był już aktywny')).toBeTruthy();
        expect(screen.queryByText(/nie została pobrana/)).toBeNull();
        expect(invalidate).not.toHaveBeenCalled();

        await advance(10_000);
        expect(newSubscriptionApi.getOrder).toHaveBeenCalledTimes(1);
    });

    it('FAILED: koniec, nic nie zostało pobrane', async () => {
        vi.mocked(newSubscriptionApi.getOrder).mockResolvedValue(order('FAILED'));
        renderPage();
        await advance(0);

        expect(screen.getByText('Płatność nie powiodła się')).toBeTruthy();
        expect(screen.getByText(/Żadna kwota nie została pobrana/)).toBeTruthy();
        await advance(10_000);
        expect(newSubscriptionApi.getOrder).toHaveBeenCalledTimes(1);
    });

    it('limit czasu w PAID: wpłata potwierdzona, inny komunikat niż przy braku wpłaty', async () => {
        vi.mocked(newSubscriptionApi.getOrder).mockResolvedValue(order('PAID'));
        renderPage();
        await advance(0);
        await advance(95_000);

        expect(screen.getByText('Płatność przyjęta, aktywacja trwa dłużej niż zwykle')).toBeTruthy();
        expect(screen.getByText(/nie płać drugi raz/)).toBeTruthy();
        expect(screen.queryByText('Płatność wciąż jest przetwarzana')).toBeNull();
        expect(filledButtons()).toHaveLength(1);
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('limit czasu w PENDING albo EXPIRED: „wciąż przetwarzana"', async () => {
        vi.mocked(newSubscriptionApi.getOrder)
            .mockResolvedValueOnce(order('PENDING'))
            .mockResolvedValue(order('EXPIRED'));
        renderPage();
        await advance(0);
        await advance(95_000);

        expect(screen.getByText('Płatność wciąż jest przetwarzana')).toBeTruthy();
        expect(screen.queryByText(/aktywacja trwa dłużej/)).toBeNull();
    });

    it('bez identyfikatora zamówienia nie pyta serwera', async () => {
        renderPage('');
        await advance(0);
        expect(screen.getByText('Brak identyfikatora zamówienia')).toBeTruthy();
        expect(newSubscriptionApi.getOrder).not.toHaveBeenCalled();
    });
});
