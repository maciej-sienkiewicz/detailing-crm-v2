import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { apiErrorMessage, apiErrorStatus } from '../api/apiError';
import { visitDetailQueryKey } from './index';
import { useToast } from '@/common/components/Toast';
import type { NotificationChannels } from '../types/stateTransitions';

/**
 * Oznaczenie pojazdu jako gotowego do odbioru.
 *
 * Bez kreatora — jedno potwierdzenie z wyborem kanałów. Krok „weryfikacja
 * jakości" został usunięty: jego checkboxy nie trafiały do żadnego payloadu
 * (payload to wyłącznie {sms, email}) i były domyślnie zaznaczone, więc niczego
 * nie blokowały. Realna bramka — usługi w statusie PENDING — działa w widoku
 * wizyty i zostaje bez zmian.
 */
export const useMarkReady = (visitId: string, onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (channels: NotificationChannels) =>
            stateTransitionApi.markReadyForPickup(visitId, {
                sms: channels.sms,
                email: channels.email,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            onSuccess?.();
        },
        onError: (error: unknown) => {
            if (apiErrorStatus(error) === 402) {
                showError(
                    'Brak kredytów SMS',
                    apiErrorMessage(error, 'Doładuj konto w panelu zarządzania.')
                );
            } else {
                showError('Błąd', 'Nie udało się zmienić statusu wizyty.');
            }
        },
    });

    return { markReady: mutate, isMarkingReady: isPending };
};
