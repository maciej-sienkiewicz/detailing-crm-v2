import { Button, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useCancelPendingPlanChange } from '../api/subscriptionQueries';
import { DOWNGRADE_ALREADY_PAID_CODE, type PendingDowngrade } from '../types';
import { formatDate } from '../utils/formatters';
import { apiErrorCode, apiErrorMessage, apiErrorStatus, toastUnhandledError } from '../utils/apiErrors';

interface Props {
    pendingDowngrade: PendingDowngrade;
}

/**
 * Zaplanowane obniżenie planu. Bursztyn = „przeczytaj": nic się jeszcze nie stało,
 * ale stanie się samo. Odwołanie to akcja dostępna, nie krok następny, więc bez wypełnienia.
 *
 * Gdy kolejny okres jest już opłacony po cenie niższego planu (`cancellable: false`),
 * przycisku nie ma - wcześniej był, a każde kliknięcie kończyło się błędem. Zamiast
 * niego zdanie, co zrobić: do wyższego planu wraca się zmianą planu.
 */
export function PendingDowngradeBanner({ pendingDowngrade }: Props) {
    const { showSuccess, showError, showWarning, showInfo } = useToast();
    const cancel = useCancelPendingPlanChange();
    const { toPlanName, effectiveAt, cancellable } = pendingDowngrade;

    const handleCancel = async () => {
        try {
            await cancel.mutateAsync();
            showSuccess('Zmiana odwołana', 'Zostajesz przy obecnym planie.');
        } catch (err) {
            // Oba przypadki niżej to nie awaria, tylko nieaktualny baner - dane planu
            // odświeża mutacja (onSettled), a toast mówi, co się właściwie stało.
            if (apiErrorStatus(err) === 409 && apiErrorCode(err) === DOWNGRADE_ALREADY_PAID_CODE) {
                showWarning(
                    'Za późno na odwołanie',
                    apiErrorMessage(err)
                        ?? `Kolejny okres jest już opłacony w cenie planu ${toPlanName}. Do wyższego planu wrócisz później przez zmianę planu.`,
                );
                return;
            }
            if (apiErrorStatus(err) === 404) {
                showInfo('Nie ma już zaplanowanej zmiany', 'Zmiana planu została już wprowadzona albo odwołana. Odświeżyliśmy dane abonamentu.');
                return;
            }
            toastUnhandledError(showError, err, 'Nie udało się odwołać zmiany', 'Spróbuj ponownie za chwilę.');
        }
    };

    return (
        <Notice
            tone="warn"
            title="Zaplanowana zmiana planu"
            action={cancellable ? (
                <Button size="sm" onClick={handleCancel} disabled={cancel.isPending}>
                    {cancel.isPending ? 'Odwoływanie…' : 'Odwołaj zmianę'}
                </Button>
            ) : undefined}
        >
            <span>
                Od {formatDate(effectiveAt)} plan zmieni się na {toPlanName}.
                Do tego dnia masz pełny dostęp do obecnego planu.
            </span>
            {!cancellable && (
                <span>
                    Kolejny okres jest już opłacony w cenie planu {toPlanName}, więc tej zmiany nie da się
                    odwołać. Do wyższego planu wrócisz później przez zmianę planu.
                </span>
            )}
        </Notice>
    );
}
