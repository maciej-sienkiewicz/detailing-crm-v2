// src/modules/operations/hooks/useReservationActions.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';

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

    const mutation = useMutation({
        mutationFn: (reservationId: string) => operationApi.cancelReservation(reservationId),
        onSuccess: () => {
            // Odśwież listę operacji
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        },
    });

    return {
        cancelReservation: mutation.mutate,
        isCancelling: mutation.isPending,
        error: mutation.error,
    };
};
