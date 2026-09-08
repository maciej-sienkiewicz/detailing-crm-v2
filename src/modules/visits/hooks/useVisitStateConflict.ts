import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { apiErrorMessage } from '../api/apiError';
import { VISIT_ALREADY_IN_STATE, apiErrorCode, isStateConflict } from '../api/stateConflict';
import { visitDetailQueryKey } from './index';

/**
 * Reakcja na konflikt stanu wizyty: odśwież widok i powiedz, co się stało.
 *
 * Konflikt znaczy, że przeglądarka pokazywała nieaktualny status — pracownik nie
 * zrobił nic złego. Sam komunikat by tu nie wystarczył: bez odświeżenia ekran nadal
 * pokazuje ten sam nieaktualny przycisk, więc następne kliknięcie skończy się tak
 * samo. Dlatego najpierw unieważniamy dane wizyty, a dopiero potem mówimy dlaczego.
 *
 * Ton jest celowo neutralny (info), nie czerwony: „ktoś już to zrobił" to normalny
 * dzień w warsztacie, w którym auto wydaje jedna osoba, a wizytę zamyka druga.
 */
export const useVisitStateConflict = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showInfo } = useToast();

    /**
     * @returns true, gdy błąd był konfliktem stanu i został już obsłużony —
     *          wywołujący nie pokazuje wtedy własnego komunikatu o błędzie.
     */
    return useCallback(
        (error: unknown): boolean => {
            if (!isStateConflict(error)) return false;

            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: ['operations'] });

            const alreadyDone = apiErrorCode(error) === VISIT_ALREADY_IN_STATE;
            showInfo(
                alreadyDone ? 'To już zostało zrobione' : 'Wizyta zmieniła się w międzyczasie',
                `${apiErrorMessage(error, 'Status wizyty zmienił się w międzyczasie.')} Odświeżyliśmy widok.`
            );
            return true;
        },
        [queryClient, showInfo, visitId]
    );
};
