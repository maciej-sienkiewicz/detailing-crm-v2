import { Button, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useCancelPendingPlanChange } from '../api/subscriptionQueries';
import type { PendingDowngrade } from '../types';
import { formatDate } from '../utils/formatters';
import { toastUnhandledError } from '../utils/apiErrors';

interface Props {
    pendingDowngrade: PendingDowngrade;
}

/**
 * Zaplanowane obniżenie planu. Bursztyn = „przeczytaj": nic się jeszcze nie stało,
 * ale stanie się samo. Odwołanie to akcja dostępna, nie krok następny, więc bez wypełnienia.
 */
export function PendingDowngradeBanner({ pendingDowngrade }: Props) {
    const { showSuccess, showError } = useToast();
    const cancel = useCancelPendingPlanChange();

    const handleCancel = async () => {
        try {
            await cancel.mutateAsync();
            showSuccess('Zmiana odwołana', 'Zostajesz przy obecnym planie.');
        } catch (err) {
            toastUnhandledError(showError, err, 'Nie udało się odwołać zmiany', 'Spróbuj ponownie za chwilę.');
        }
    };

    return (
        <Notice
            tone="warn"
            title="Zaplanowana zmiana planu"
            action={(
                <Button size="sm" onClick={handleCancel} disabled={cancel.isPending}>
                    {cancel.isPending ? 'Odwoływanie…' : 'Odwołaj zmianę'}
                </Button>
            )}
        >
            Od {formatDate(pendingDowngrade.effectiveAt)} plan zmieni się na {pendingDowngrade.toPlanName}.
            Do tego dnia masz pełny dostęp do obecnego planu.
        </Notice>
    );
}
