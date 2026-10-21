// src/modules/operations/hooks/useReservationActions.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { visitKeys } from '@/modules/visits/api/visitKeys';
import { useToast } from '@/common/components/Toast';

export const useUpdateReservationDate = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({
            reservationId,
            startDateTime,
            endDateTime,
        }: {
            reservationId: string;
            startDateTime: string;
            endDateTime: string;
        }) => operationApi.updateReservationDate(reservationId, startDateTime, endDateTime),
        onSuccess: () => {
            // Odśwież listę operacji
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        },
    });

    return {
        updateDate: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
};

export const useCancelReservation = () => {
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();

    const mutation = useMutation({
        mutationFn: (reservationId: string) => operationApi.cancelReservation(reservationId),
        onSuccess: () => {
            // Odśwież listę operacji
            queryClient.invalidateQueries({ queryKey: ['operations'] });

            // Pokaż toast z informacją o porzuceniu rezerwacji
            showSuccess('Rezerwacja została porzucona');
        },
    });

    return {
        cancelReservation: mutation.mutate,
        isCancelling: mutation.isPending,
        error: mutation.error,
    };
};

export const useUpdateOperationTitle = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const mutation = useMutation({
        mutationFn: ({ id, type, title }: { id: string; type: 'VISIT' | 'RESERVATION'; title: string }) =>
            type === 'VISIT'
                ? import('@/modules/visits/api/visitApi').then(m => m.visitApi.updateTitle(id, title))
                : appointmentApi.updateTitle(id, title),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming-visits'] });
            if (vars.type === 'VISIT') {
                queryClient.invalidateQueries({ queryKey: visitKeys.detail(vars.id) });
            }
            showSuccess(vars.type === 'VISIT' ? 'Zapisano tytuł wizyty' : 'Zapisano tytuł rezerwacji');
        },
        onError: () => {
            showError('Nie udało się zapisać tytułu');
        },
    });

    return {
        updateOperationTitle: mutation.mutateAsync,
        isUpdatingTitle: mutation.isPending,
        updatingId: mutation.isPending ? (mutation.variables as any)?.id : null,
    };
};

