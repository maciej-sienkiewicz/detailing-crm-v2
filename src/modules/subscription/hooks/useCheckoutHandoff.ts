import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkoutNextStep, paymentResultPath, type CheckoutNextStep } from '../utils/paymentOrderStatus';
import type { CheckoutResponse } from '../types';
import { assignSafeUrl } from '@/common/utils/safeUrl';

/**
 * Wspólny koniec każdego „Kup / Przedłuż / Włącz" po odpowiedzi checkoutu.
 *
 * Przekierowuje do Przelewy24, a zamówienie, które jeszcze się rozstrzyga (PAID: pieniądze
 * są, efekt nie), oddaje stronie wyniku płatności - ta już odpytuje, ma limit czasu
 * i „Odśwież". Zwraca krok, żeby okno samo powiedziało o sukcesie albo błędzie swoimi
 * słowami („Moduł włączony", „Pakiet przedłużony") - ale TYLKO gdy krok to `done`.
 *
 * Dawniej każde z pięciu miejsc wywołujących checkout uznawało brak `paymentUrl` za
 * sukces, więc anulowane darmowe zamówienie kończyło się zielonym toastem.
 */
export function useCheckoutHandoff() {
    const navigate = useNavigate();
    return useCallback((order: CheckoutResponse): CheckoutNextStep => {
        const step = checkoutNextStep(order);
        if (step.kind === 'redirect') assignSafeUrl(step.url);
        if (step.kind === 'track') navigate(paymentResultPath(step.orderId));
        return step;
    }, [navigate]);
}

/**
 * Toast dla zamówienia, które nie doszło do skutku. Zwrot to nie błąd kupującego - pieniądze
 * wrócą same, więc ostrzeżenie (bursztyn: „przeczytaj"), a nie czerwień.
 */
export function toastCheckoutProblem(
    toast: { showError: (title: string, message?: string) => void; showWarning: (title: string, message?: string) => void },
    step: Extract<CheckoutNextStep, { kind: 'refund' | 'failed' }>,
): void {
    if (step.kind === 'refund') toast.showWarning(step.title, step.message);
    else toast.showError(step.title, step.message);
}
