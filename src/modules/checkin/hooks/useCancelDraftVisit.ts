// src/modules/checkin/hooks/useCancelDraftVisit.ts

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { visitApi } from '@/modules/visits/api/visitApi';
import { isHandledGlobally } from '@/modules/subscription/utils/apiErrors';
import { checkinErrorMessage, DOCUMENTS_ERROR_TEXTS } from '../utils/checkinErrorMessage';

/**
 * „Anuluj wizytę" nieukończonego przyjęcia - z okna dokumentów i ze stopki kreatora, gdy
 * poprawka usług się nie zapisała. Jedno miejsce na komunikaty, żeby obie drogi mówiły
 * o rezerwacji to samo: walk-in nie zostawia w kalendarzu nic, rezerwacja do niego wraca.
 *
 * Błąd 4xx pokazał już interceptor - drugi dymek z tym samym zdaniem nic nie dodaje.
 * 5xx i zerwane połączenie interceptor przemilcza, więc te mówimy sami.
 */
export function useCancelDraftVisit(onCancelled: () => void) {
    const { showSuccess, showError } = useToast();

    return useMutation({
        mutationFn: (visitId: string) => visitApi.cancelDraftVisit(visitId),
        onSuccess: ({ reservationKept }) => {
            showSuccess(
                'Wizyta została anulowana',
                reservationKept
                    ? 'Rezerwacja pozostała w kalendarzu - auto można przyjąć od nowa.'
                    : 'Przyjęcie usunięte, w kalendarzu nic po nim nie zostało.',
            );
            onCancelled();
        },
        onError: (error: unknown) => {
            if (isHandledGlobally(error)) return;
            showError('Nie udało się anulować wizyty', checkinErrorMessage(error, DOCUMENTS_ERROR_TEXTS));
        },
    });
}
