import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { invalidateSubscriptionData } from '../api/subscriptionQueries';
import { isFinalOutcome, paymentOutcome, type PaymentOutcome } from '../utils/paymentOrderStatus';
import { apiErrorMessage } from '../utils/apiErrors';
import type { PaymentOrder } from '../types';

/** Odpytywanie, póki potwierdzenie z P24 zwykle przychodzi (kilka sekund). */
export const POLL_INTERVAL_MS = 2500;
/** Po przekroczeniu limitu odpytujemy dalej w tle, rzadziej. */
export const SLOW_POLL_INTERVAL_MS = 10_000;
/** Po tym czasie kupujący dostaje wyjście zamiast samego kręcącego się kółka. */
export const CONFIRMATION_TIMEOUT_MS = 60_000;
/** Limit jednego żądania - zawieszone żądanie nie może wstrzymać pętli. */
export const REQUEST_TIMEOUT_MS = 10_000;

export interface PaymentOrderPolling {
    order: PaymentOrder | null;
    outcome: PaymentOutcome;
    /** Limit czasu minął, a zamówienie wciąż nie jest rozstrzygnięte. Odpytywanie trwa. */
    delayed: boolean;
    /** Trwa „Odśwież" - pytanie Przelewy24 o transakcję. */
    refreshing: boolean;
    /** Co powiedzieć po „Odśwież", które niczego nie rozstrzygnęło (limit, P24 nie odpowiada). */
    refreshNote: string | null;
    refresh: () => void;
}

/** Odpowiedź 429 na „Odśwież": ciało to bieżący stan zamówienia (backend nie pytał P24). */
function throttledOrder(error: unknown): PaymentOrder | null {
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
    if (response?.status !== 429) return null;
    const body = response.data as Partial<PaymentOrder> | undefined;
    return body && typeof body.status === 'string' ? (body as PaymentOrder) : null;
}

export const REFRESH_THROTTLED_NOTE = 'Sprawdziliśmy to przed chwilą. Spróbuj ponownie za kilka sekund.';
export const REFRESH_FAILED_NOTE = 'Nie udało się teraz sprawdzić płatności. Spróbuj ponownie za chwilę.';

/**
 * Odpytuje zamówienie po powrocie z Przelewy24, aż stan się rozstrzygnie.
 *
 * Co poszło źle poprzednio i czego ta pętla pilnuje:
 *  - rozpoznaje CAŁY zbiór stanów backendu (`paymentOutcome`) - czekanie na samo PAID
 *    przegapiało FULFILLED i strona nie wychodziła z „Sprawdzamy płatność…";
 *  - limit czasu liczy osobny zegar, nie pętla - dawniej sprawdzała go dopiero po
 *    powrocie żądania, więc jedno zawieszone żądanie zatrzymywało wszystko;
 *  - po limicie NIE przestaje odpytywać: przechodzi na rzadszy rytm, a kupujący widzi
 *    komunikat z wyjściem;
 *  - „Odśwież" pyta Przelewy24 przez backend (`refreshOrder`), a nie tylko naszą bazę:
 *    dawne „Sprawdź ponownie" robiło to samo co pętla, więc przy zgubionej notyfikacji
 *    kupujący klikał w nieskończoność, a zamówienie czekało 20 minut na worker;
 *  - udany zakup unieważnia dane pakietu (bramka subskrypcji, plan, historia), więc
 *    aplikacja widzi nowy stan bez przeładowania strony.
 */
export function usePaymentOrderPolling(orderId: string | null): PaymentOrderPolling {
    const queryClient = useQueryClient();
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    const [outcome, setOutcome] = useState<PaymentOutcome>('waiting');
    const [delayed, setDelayed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshNote, setRefreshNote] = useState<string | null>(null);
    // Uchwyt do pętli z efektu dla przycisku - pętla żyje w efekcie, przycisk poza nim.
    const refreshNow = useRef<() => Promise<string | null>>(() => Promise.resolve(null));

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        let finished = false;
        let slow = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let inFlight: Promise<void> | null = null;

        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { void poll(); }, slow ? SLOW_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
        };

        /** Wspólny koniec odczytu i „Odśwież": ten sam zbiór stanów, to samo domknięcie. */
        const apply = (result: PaymentOrder): PaymentOutcome => {
            const next = paymentOutcome(result.status);
            setOrder(result);
            setOutcome(next);
            if (isFinalOutcome(next)) {
                finished = true;
                clearTimeout(timer);
                clearTimeout(deadline);
                if (next === 'done' || next === 'refund') invalidateSubscriptionData(queryClient);
            }
            return next;
        };

        const fetchOnce = async () => {
            clearTimeout(timer);
            try {
                const result = await newSubscriptionApi.getOrder(orderId, REQUEST_TIMEOUT_MS);
                // Odpowiedź, która przyszła po rozstrzygnięciu („Odśwież" zdążył pierwszy), jest
                // starsza od niego - nie wolno jej cofnąć widoku z sukcesu do czekania.
                if (cancelled || finished) return;
                apply(result);
            } catch {
                // Błąd przejściowy (sieć, limit czasu żądania) - kolejna próba w następnym takcie.
                if (cancelled) return;
            }
            if (!finished) schedule();
        };

        // Jedno żądanie naraz: takt pętli w trakcie trwającego odczytu dołącza do niego.
        const poll = (): Promise<void> => {
            if (cancelled || finished) return Promise.resolve();
            if (!inFlight) inFlight = fetchOnce().finally(() => { inFlight = null; });
            return inFlight;
        };

        // „Odśwież" NIE dołącza do odczytu w toku: tamten czyta tylko naszą bazę, a ten każe
        // backendowi zapytać Przelewy24 (zgubiona notyfikacja). Zwraca notkę dla kupującego,
        // gdy niczego nie rozstrzygnął z powodu limitu albo awarii.
        const refreshOnce = async (): Promise<string | null> => {
            if (cancelled || finished) return null;
            try {
                const result = await newSubscriptionApi.refreshOrder(orderId, REQUEST_TIMEOUT_MS);
                if (cancelled || finished) return null;
                apply(result);
                return null;
            } catch (error) {
                if (cancelled || finished) return null;
                const current = throttledOrder(error);
                if (current) {
                    apply(current);
                    return finished ? null : REFRESH_THROTTLED_NOTE;
                }
                return apiErrorMessage(error) ?? REFRESH_FAILED_NOTE;
            } finally {
                if (!cancelled && !finished) schedule();
            }
        };

        const deadline = setTimeout(() => {
            if (cancelled || finished) return;
            slow = true;
            setDelayed(true);
        }, CONFIRMATION_TIMEOUT_MS);

        refreshNow.current = refreshOnce;
        void poll();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            clearTimeout(deadline);
            refreshNow.current = () => Promise.resolve(null);
        };
    }, [orderId, queryClient]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        setRefreshNote(null);
        void refreshNow.current()
            .then(setRefreshNote)
            .finally(() => setRefreshing(false));
    }, []);

    return { order, outcome, delayed, refreshing, refreshNote, refresh };
}
