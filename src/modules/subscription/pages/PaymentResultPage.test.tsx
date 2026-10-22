// @vitest-environment jsdom
//
// Powrót z Przelewy24: zgłoszenie z produkcji „po zapłacie strona wisi na »Sprawdzamy
// płatność…«, pomaga dopiero odświeżenie". Webhook realizuje zamówienie od razu, więc
// odpytywanie widzi FULFILLED, nie PAID - a strona czekała wyłącznie na PAID. Do tego
// zawieszone żądanie wstrzymywało pętlę razem z limitem czasu, a sam limit kończył się
// kolejnym kółkiem bez wyjścia.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { PaymentResultPage } from './PaymentResultPage';
import { newSubscriptionApi } from '../api/subscriptionApi';
import {
    CONFIRMATION_TIMEOUT_MS,
    POLL_INTERVAL_MS,
    REFRESH_FAILED_NOTE,
    REFRESH_THROTTLED_NOTE,
    REQUEST_TIMEOUT_MS,
    SLOW_POLL_INTERVAL_MS,
} from '../hooks/usePaymentOrderPolling';
import { paymentOutcome } from '../utils/paymentOrderStatus';
import type { PaymentOrder, PaymentOrderStatus } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { getOrder: vi.fn(), refreshOrder: vi.fn() },
}));

const getOrder = vi.mocked(newSubscriptionApi.getOrder);
const refreshOrder = vi.mocked(newSubscriptionApi.refreshOrder);

/** Błąd w kształcie axiosa - tak, jak apiClient go rzuca. */
const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
/** 429 na „Odśwież": problem RFC 9457 z bieżącym stanem zamówienia w `order`. */
const throttled = (current: PaymentOrder) => httpError(429, {
    type: 'urn:detailboost:problem:refresh-throttled', title: 'Za często', status: 429,
    detail: 'Sprawdziliśmy to przed chwilą. Spróbuj ponownie za kilka sekund.', code: 'REFRESH_THROTTLED', order: current,
});

const order = (status: PaymentOrderStatus, overrides: Partial<PaymentOrder> = {}): PaymentOrder => ({
    orderId: 'ord-1',
    type: 'RENEWAL',
    typeDisplayName: 'Przedłużenie pakietu',
    status,
    amountCents: 29900,
    currency: 'PLN',
    description: 'Przedłużenie pakietu (FULL) — 30 dni',
    createdAt: '2026-10-15T10:00:00Z',
    paidAt: status === 'PENDING' ? null : '2026-10-15T10:01:00Z',
    failureReason: null,
    ...overrides,
});

let queryClient: QueryClient;

const renderPage = (url = '/payments/result?orderId=ord-1') => render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/payments/result" element={<PaymentResultPage />} />
                    <Route path="/settings" element={<div>Ustawienia</div>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    </ThemeProvider>,
);

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const flush = () => advance(0);

beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getOrder.mockReset();
    refreshOrder.mockReset();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('paymentOutcome', () => {
    it('zna cały zbiór stanów backendu, a FULFILLED to sukces', () => {
        expect(paymentOutcome('FULFILLED')).toBe('done');
        expect(paymentOutcome('PAID')).toBe('activating');
        expect(paymentOutcome('PENDING')).toBe('waiting');
        expect(paymentOutcome('REFUND_REQUIRED')).toBe('refund');
        expect(paymentOutcome('FAILED')).toBe('failed');
        expect(paymentOutcome('CANCELLED')).toBe('failed');
    });

    it('EXPIRED czeka dalej - spóźniona płatność wraca do PAID', () => {
        expect(paymentOutcome('EXPIRED')).toBe('waiting');
        expect(paymentOutcome('SOMETHING_NEW')).toBe('waiting');
    });
});

describe('PaymentResultPage', () => {
    it('odtworzenie zgłoszenia: PENDING → FULFILLED kończy się sukcesem bez przeładowania i odświeża pakiet', async () => {
        getOrder
            .mockResolvedValueOnce(order('PENDING'))
            .mockResolvedValue(order('FULFILLED'));
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        renderPage();
        await flush();
        expect(screen.getByText('Sprawdzamy płatność…')).toBeTruthy();
        expect(screen.getByText('Przedłużenie pakietu (FULL) — 30 dni: 299,00 zł')).toBeTruthy();

        await advance(POLL_INTERVAL_MS);
        expect(screen.queryByText('Sprawdzamy płatność…')).toBeNull();
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();

        const keys = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
        expect(keys).toContain(JSON.stringify(['subscription', 'status']));
        expect(keys).toContain(JSON.stringify(['subscription', 'entitlements']));
        expect(keys).toContain(JSON.stringify(['subscription', 'my-plan']));

        // Rozstrzygnięte zamówienie nie jest już odpytywane.
        const calls = getOrder.mock.calls.length;
        await advance(SLOW_POLL_INTERVAL_MS * 3);
        expect(getOrder.mock.calls.length).toBe(calls);
    });

    it('PAID to „włączamy dostęp", a nie koniec - odpytywanie czeka na FULFILLED', async () => {
        getOrder
            .mockResolvedValueOnce(order('PAID'))
            .mockResolvedValue(order('FULFILLED'));

        renderPage();
        await flush();
        expect(screen.getByText('Płatność przyjęta, włączamy dostęp…')).toBeTruthy();

        await advance(POLL_INTERVAL_MS);
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
    });

    it('żądanie ma limit czasu - zawieszona odpowiedź nie wstrzymuje pętli', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        renderPage();
        await flush();
        expect(getOrder).toHaveBeenCalledWith('ord-1', REQUEST_TIMEOUT_MS);
    });

    it('po limicie czasu pokazuje wyjście, odpytuje dalej w tle i samo przechodzi w sukces', async () => {
        // Pierwsza odpowiedź nie wraca nigdy: dawniej limit liczyła sama pętla, więc ten
        // przypadek zostawiał kółko na zawsze.
        getOrder.mockReturnValueOnce(new Promise(() => {}));
        renderPage();
        await flush();

        await advance(CONFIRMATION_TIMEOUT_MS);
        expect(screen.getByText('Płatność jeszcze nie potwierdzona')).toBeTruthy();
        expect(screen.queryByText('Sprawdzamy płatność…')).toBeNull();

        // Jedno wypełnienie w oknie (CLAUDE.md §2): „Odśwież" jest krokiem następnym, a dawne
        // „Sprawdź ponownie" weszło w nie - nie ma dwóch podobnych akcji.
        const filled = document.querySelectorAll('button[data-variant="primary"], button[data-variant="success"]');
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toBe('Odśwież');
        expect(screen.queryByRole('button', { name: 'Sprawdź ponownie' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Wróć do aplikacji' })).toBeTruthy();
    });

    it('w trakcie zwykłego czekania „Odśwież" jest dostępne, ale nic nie jest wypełnione', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        renderPage();
        await flush();

        expect(screen.getByText('Sprawdzamy płatność…')).toBeTruthy();
        const refresh = screen.getByRole('button', { name: 'Odśwież' });
        expect(refresh.getAttribute('data-variant')).toBe('outline');
        expect(document.querySelectorAll('button[data-variant="primary"], button[data-variant="success"]')).toHaveLength(0);
    });

    it('„Wróć do aplikacji" po limicie prowadzi do ustawień', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);
        fireEvent.click(screen.getByRole('button', { name: 'Wróć do aplikacji' }));
        await flush();
        expect(screen.getByText('Ustawienia')).toBeTruthy();
    });

    it('zgubiona notyfikacja: „Odśwież" pyta Przelewy24 przez backend i domyka sukces', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);
        expect(screen.getByText('Płatność jeszcze nie potwierdzona')).toBeTruthy();

        // Po limicie rytm jest wolniejszy, ale nie staje.
        const before = getOrder.mock.calls.length;
        await advance(SLOW_POLL_INTERVAL_MS);
        expect(getOrder.mock.calls.length).toBe(before + 1);

        // Baza wciąż mówi PENDING - tylko pytanie P24 może to zmienić.
        refreshOrder.mockResolvedValue(order('FULFILLED'));
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();

        expect(refreshOrder).toHaveBeenCalledWith('ord-1', REQUEST_TIMEOUT_MS);
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
        expect(invalidate.mock.calls.map(([f]) => JSON.stringify(f?.queryKey))).toContain(JSON.stringify(['subscription', 'my-plan']));

        // Rozstrzygnięte: pętla w tle już nie pyta i nie cofa widoku.
        const calls = getOrder.mock.calls.length;
        await advance(SLOW_POLL_INTERVAL_MS * 2);
        expect(getOrder.mock.calls.length).toBe(calls);
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
    });

    it('„Odśwież" przy wciąż nieopłaconym zostaje na czekaniu i odpytuje dalej', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockResolvedValue(order('PENDING'));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText('Płatność jeszcze nie potwierdzona')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();

        const before = getOrder.mock.calls.length;
        getOrder.mockResolvedValue(order('FULFILLED'));
        await advance(SLOW_POLL_INTERVAL_MS);
        expect(getOrder.mock.calls.length).toBe(before + 1);
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
    });

    it('PAID po „Odśwież" to dalej „włączamy dostęp", nie sukces', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockResolvedValue(order('PAID'));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText('Płatność przyjęta, dostęp jeszcze się włącza')).toBeTruthy();
    });

    it('zbyt częste „Odśwież" (429): pokazuje stan z odpowiedzi i mówi, żeby chwilę poczekać', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockRejectedValue(throttled(order('PENDING')));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText(REFRESH_THROTTLED_NOTE)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Odśwież' })).toBeTruthy();
    });

    it('429 z już rozstrzygniętym stanem pokazuje wynik bez notki o limicie', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockRejectedValue(throttled(order('FULFILLED')));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
        expect(screen.queryByText(REFRESH_THROTTLED_NOTE)).toBeNull();
    });

    it('P24 nie odpowiada (503): komunikat z backendu, czekanie trwa', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockRejectedValue(httpError(503, { message: 'Nie udało się teraz sprawdzić płatności w Przelewy24.' }));
        renderPage();
        await flush();
        await advance(CONFIRMATION_TIMEOUT_MS);

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText('Nie udało się teraz sprawdzić płatności w Przelewy24.')).toBeTruthy();
        expect(screen.getByText('Płatność jeszcze nie potwierdzona')).toBeTruthy();
    });

    it('zerwane połączenie przy „Odśwież" mówi o tym zamiast milczeć', async () => {
        getOrder.mockResolvedValue(order('PENDING'));
        refreshOrder.mockRejectedValue(new Error('Network Error'));
        renderPage();
        await flush();

        fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }));
        await flush();
        expect(screen.getByText(REFRESH_FAILED_NOTE)).toBeTruthy();
    });

    it('błędy sieci nie zatrzymują odpytywania', async () => {
        getOrder
            .mockRejectedValueOnce(new Error('Network Error'))
            .mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'))
            .mockResolvedValue(order('FULFILLED'));

        renderPage();
        await flush();
        await advance(POLL_INTERVAL_MS);
        await advance(POLL_INTERVAL_MS);
        expect(screen.getByText('Płatność przyjęta')).toBeTruthy();
    });

    it('REFUND_REQUIRED mówi o zwrocie zamiast udawać sukces albo kręcić się dalej', async () => {
        getOrder.mockResolvedValue(order('REFUND_REQUIRED', { failureReason: 'Ten moduł jest już aktywny.' }));
        renderPage();
        await flush();
        expect(screen.getByText('Płatność przyjęta, ale zakupu nie da się włączyć')).toBeTruthy();
        expect(screen.getByText(/Ten moduł jest już aktywny\./)).toBeTruthy();
    });

    it('FAILED kończy odpytywanie komunikatem o niepowodzeniu', async () => {
        getOrder.mockResolvedValue(order('FAILED'));
        renderPage();
        await flush();
        expect(screen.getByText('Płatność nie powiodła się')).toBeTruthy();
        const calls = getOrder.mock.calls.length;
        await advance(SLOW_POLL_INTERVAL_MS);
        expect(getOrder.mock.calls.length).toBe(calls);
    });

    it('bez orderId pokazuje niepełny link i niczego nie odpytuje', async () => {
        renderPage('/payments/result');
        await flush();
        expect(screen.getByText('Niepełny link do płatności')).toBeTruthy();
        expect(getOrder).not.toHaveBeenCalled();
    });
});
