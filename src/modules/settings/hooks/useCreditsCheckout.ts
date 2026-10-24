// src/modules/settings/hooks/useCreditsCheckout.ts
//
// Zakup pakietu kredytów SMS przez Przelewy24 - wspólny dla Ustawień i kreatora przy wizycie.
//
// Backend zakłada zamówienie i odpowiada jak checkout abonamentu: adres strony płatności P24
// albo (tryb mock, lokalnie) zamówienie już zrealizowane. Dalej działa ten sam koniec co przy
// pakiecie i modułach (`useCheckoutHandoff`): przekierowanie do P24, a po powrocie strona
// wyniku płatności. Zapamiętane miejsce powrotu sprawia, że „Przejdź do aplikacji" prowadzi
// tam, skąd kupujący poszedł płacić, a nie zawsze do ustawień.

import { useCallback } from 'react';
import { useToast } from '@/common/components/Toast';
import { problemDetail } from '@/core/problem';
import { toastCheckoutProblem, useCheckoutHandoff } from '@/modules/subscription/hooks/useCheckoutHandoff';
import { rememberPaymentReturn } from '@/modules/subscription/utils/paymentOrderStatus';
import type { SmsCreditPackage } from '../types';
import { creditsLabel, formatCreditCount } from '../components/smsCreditPricing';
import { usePurchaseCredits } from './useSmsCredits';

interface BuyOptions {
    /** Ścieżka w aplikacji, do której strona wyniku płatności odeśle kupującego. */
    returnPath: string;
    /** Zakup zrealizowany bez wyjścia do P24 (tryb mock): okno może się zamknąć. */
    onDone?: () => void;
}

export function useCreditsCheckout() {
    const purchase = usePurchaseCredits();
    const handoff = useCheckoutHandoff();
    const toast = useToast();

    const buy = useCallback((pkg: SmsCreditPackage, { returnPath, onDone }: BuyOptions) => {
        purchase.mutate(pkg.id, {
            onSuccess: order => {
                rememberPaymentReturn(order.orderId, returnPath);
                const step = handoff(order);
                if (step.kind === 'done') {
                    toast.showSuccess(
                        'Kredyty dodane',
                        `Na konto trafił pakiet ${pkg.name}, ${formatCreditCount(pkg.creditAmount)} ${creditsLabel(pkg.creditAmount)}.`,
                    );
                    onDone?.();
                } else if (step.kind === 'refund' || step.kind === 'failed') {
                    toastCheckoutProblem(toast, step);
                }
                // `redirect`: przeglądarka idzie do P24. `track`: stronę wyniku płatności otwiera handoff.
            },
            // Okno zostaje otwarte: odmowa to moment na „spróbuj ponownie" albo „anuluj",
            // a nie na szukanie od nowa, który pakiet był wybrany.
            onError: err => toast.showError(
                'Zakup się nie udał',
                problemDetail(err) ?? 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
            ),
        });
    }, [purchase, handoff, toast]);

    return { buy, isPending: purchase.isPending };
}
