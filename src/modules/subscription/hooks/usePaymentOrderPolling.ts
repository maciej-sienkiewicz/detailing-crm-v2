import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { invalidateSubscriptionData } from '../api/subscriptionQueries';
import { isFinalOutcome, paymentOutcome, type PaymentOutcome } from '../utils/paymentOrderStatus';
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
    /** Trwa sprawdzenie zlecone ręcznie („Sprawdź ponownie"). */
    checking: boolean;
    checkNow: () => void;
}

/**
 * Odpytuje zamówienie po powrocie z Przelewy24, aż stan się rozstrzygnie.
 *
 * Co poszło źle poprzednio i czego ta pętla pilnuje:
 *  - rozpoznaje CAŁY zbiór stanów backendu (`paymentOutcome`) - czekanie na samo PAID
 *    przegapiało FULFILLED i strona nie wychodziła z „Sprawdzamy płatność…";
 *  - limit czasu liczy osobny zegar, nie pętla - dawniej sprawdzała go dopiero po
 *    powrocie żądania, więc jedno zawieszone żądanie zatrzymywało wszystko;
 *  - po limicie NIE przestaje odpytywać: przechodzi na rzadszy rytm, a kupujący widzi
 *    komunikat z wyjściem i może sprawdzić od razu;
 *  - udany zakup unieważnia dane pakietu (bramka subskrypcji, plan, historia), więc
 *    aplikacja widzi nowy stan bez przeładowania strony.
 */
export function usePaymentOrderPolling(orderId: string | null): PaymentOrderPolling {
    const queryClient = useQueryClient();
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    const [outcome, setOutcome] = useState<PaymentOutcome>('waiting');
    const [delayed, setDelayed] = useState(false);
    const [checking, setChecking] = useState(false);
    // Uchwyt do pętli z efektu dla przycisku - pętla żyje w efekcie, przycisk poza nim.
    const pollNow = useRef<() => Promise<void>>(() => Promise.resolve());

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

        const fetchOnce = async () => {
            clearTimeout(timer);
            let next: PaymentOutcome | null = null;
            try {
                const result = await newSubscriptionApi.getOrder(orderId, REQUEST_TIMEOUT_MS);
                if (cancelled) return;
                next = paymentOutcome(result.status);
                setOrder(result);
                setOutcome(next);
            } catch {
                // Błąd przejściowy (sieć, limit czasu żądania) - kolejna próba w następnym takcie.
                if (cancelled) return;
            }
            if (next && isFinalOutcome(next)) {
                finished = true;
                clearTimeout(deadline);
                if (next === 'done' || next === 'refund') invalidateSubscriptionData(queryClient);
                return;
            }
            schedule();
        };

        // Jedno żądanie naraz: ręczne „Sprawdź ponownie" w trakcie taktu dołącza do niego.
        const poll = (): Promise<void> => {
            if (cancelled || finished) return Promise.resolve();
            if (!inFlight) inFlight = fetchOnce().finally(() => { inFlight = null; });
            return inFlight;
        };

        const deadline = setTimeout(() => {
            if (cancelled || finished) return;
            slow = true;
            setDelayed(true);
        }, CONFIRMATION_TIMEOUT_MS);

        pollNow.current = poll;
        void poll();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            clearTimeout(deadline);
            pollNow.current = () => Promise.resolve();
        };
    }, [orderId, queryClient]);

    const checkNow = useCallback(() => {
        setChecking(true);
        void pollNow.current().finally(() => setChecking(false));
    }, []);

    return { order, outcome, delayed, checking, checkNow };
}
