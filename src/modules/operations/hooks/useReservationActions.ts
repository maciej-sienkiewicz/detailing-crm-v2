// src/modules/operations/hooks/useReservationActions.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
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
    const { showToast } = useToast();

    const mutation = useMutation({
        mutationFn: (reservationId: string) => operationApi.cancelReservation(reservationId),
        onSuccess: () => {
            // Odśwież listę operacji
            queryClient.invalidateQueries({ queryKey: ['operations'] });

            // Pokaż toast z informacją o porzuceniu rezerwacji
            showToast('Rezerwacja została porzucona', 'success');
        },
    });

    return {
        cancelReservation: mutation.mutate,
        isCancelling: mutation.isPending,
        error: mutation.error,
    };
};

export const useRestoreAppointment = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const mutation = useMutation({
        mutationFn: (appointmentId: string) => operationApi.restoreAppointment(appointmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            showToast('Rezerwacja została przywrócona', 'success');
        },
    });

    return {
        restoreAppointment: mutation.mutate,
        restoreAppointmentAsync: mutation.mutateAsync,
        isRestoring: mutation.isPending,
        error: mutation.error,
    };
};

export const useUpdateAppointmentTitle = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const mutation = useMutation({
        mutationFn: ({ appointmentId, title }: { appointmentId: string; title: string }) =>
            appointmentApi.updateTitle(appointmentId, title),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming-visits'] });
            showSuccess('Tytuł rezerwacji zaktualizowany');
        },
        onError: () => {
            showError('Nie udało się zaktualizować tytułu');
        },
    });

    return {
        updateTitle: mutation.mutateAsync,
        isUpdating: mutation.isPending,
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
                queryClient.invalidateQueries({ queryKey: ['visit', vars.id] });
            }
            showSuccess(vars.type === 'VISIT' ? 'Tytuł wizyty zaktualizowany' : 'Tytuł rezerwacji zaktualizowany');
        },
        onError: () => {
            showError('Nie udało się zaktualizować tytułu');
        },
    });

    return {
        updateOperationTitle: mutation.mutateAsync,
        isUpdatingTitle: mutation.isPending,
        updatingId: mutation.isPending ? (mutation.variables as any)?.id : null,
    };
};

export const useDeleteAppointment = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const mutation = useMutation({
        mutationFn: (appointmentId: string) => operationApi.deleteAppointment(appointmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            showToast('Rezerwacja została usunięta', 'success');
        },
    });

    return {
        deleteAppointment: mutation.mutate,
        deleteAppointmentAsync: mutation.mutateAsync,
        isDeletingAppointment: mutation.isPending,
        error: mutation.error,
    };
};
