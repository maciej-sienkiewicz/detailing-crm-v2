// src/modules/appointments/api/appointmentDetailQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { appointmentApi } from './appointmentApi';

/**
 * Jeden klucz rezerwacji dla dymka w kalendarzu, edycji, przyjęcia pojazdu i sprawy leada.
 * Dawniej przyjęcie trzymało ją pod `['reservations', id]`, a lead pod `['lead-appointment', id]`,
 * więc „Rozpocznij wizytę" z dymka pobierało ją drugi raz.
 */
export const appointmentDetailKey = (appointmentId: string) => ['appointments', appointmentId] as const;

export const appointmentDetailQuery = (
    appointmentId: string,
    /** `quiet`: brak rezerwacji to brak daty do pokazania, a nie błąd użytkownika (sprawa leada). */
    { quiet = false }: { quiet?: boolean } = {},
) => queryOptions({
    queryKey: appointmentDetailKey(appointmentId),
    queryFn: ({ signal }) => appointmentApi.getAppointment(appointmentId, { signal, skipErrorToast: quiet }),
});
