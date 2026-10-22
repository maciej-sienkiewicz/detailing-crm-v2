// src/modules/appointment-colors/api/appointmentColorsQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { appointmentColorApi } from './appointmentColorApi';

/** Prefiks wszystkich zapytań o kolory - mutacje w Ustawieniach unieważniają go w całości. */
export const APPOINTMENT_COLORS_KEY = ['appointment-colors'] as const;

/**
 * Aktywne kolory do wyboru przy rezerwacji, przyjęciu i w filtrach kalendarza. Dawniej
 * leżały pod czterema kluczami (`appointment-colors`, `appointmentColors`,
 * `appointments/colors` i z filtrem `pageSize: 100`), więc ta sama lista szła z serwera
 * kilka razy, a nowy kolor dodany w kreatorze nie trafiał do filtrów kalendarza.
 */
export const appointmentColorsQuery = () => queryOptions({
    queryKey: [...APPOINTMENT_COLORS_KEY, 'active'],
    queryFn: async () => (await appointmentColorApi.getColors({ pageSize: 100 })).items,
    staleTime: STALE_TIME.catalog,
});
