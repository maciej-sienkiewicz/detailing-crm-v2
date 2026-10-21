// src/modules/dashboard/hooks/useScheduleSocket.ts
import { useEffect } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import { useAuth } from '@/core';
import { DASHBOARD_STATS_KEY } from './useDashboard';

/** Widoki, które pokazują wizyty i rezerwacje studia. */
const SCHEDULE_VIEWS = [DASHBOARD_STATS_KEY, ['dashboard', 'upcoming-visits'], ['calendar-events'], ['operations']] as const;

/**
 * Zapytanie pobrane przed chwilą pokazuje już tę zmianę: autor zapisu unieważnił je sam,
 * a push przychodzi z serwera ze sklejeniem ~1,5 s. Bez tego zapisujący pobierałby
 * kalendarz dwa razy.
 */
const FRESH_MS = 3_000;
const isStale = (query: Query) => Date.now() - query.state.dataUpdatedAt > FRESH_MS;

/**
 * SCHEDULE_CHANGED z serwera (ScheduleChangeBroadcaster): wizyty albo rezerwacje studia się
 * zmieniły. Zastępuje pulpit odpytujący `/dashboard/stats` co 30 s w każdej karcie - teraz
 * zapytanie idzie tylko po zmianie i tylko z widoku, który jest otwarty (invalidateQueries
 * pobiera ponownie jedynie aktywne zapytania).
 */
export function useScheduleSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;
        const refresh = (predicate?: (query: Query) => boolean) => SCHEDULE_VIEWS.forEach(queryKey =>
            queryClient.invalidateQueries({ queryKey, predicate }, { cancelRefetch: false }));

        const unsubscribe = subscribeToTopic(`/topic/studio.${user.studioId}.dashboard`, message => {
            try {
                if (JSON.parse(message.body)?.type === 'SCHEDULE_CHANGED') refresh(isStale);
            } catch {
                // Nie-JSON na topicu to nie nasza wiadomość.
            }
        });
        // Zmiany z czasu rozłączenia przepadły - nadrabiamy wszystkim, co otwarte.
        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (isReconnect) refresh();
        });
        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, queryClient]);
}
