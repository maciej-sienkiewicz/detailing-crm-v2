// src/modules/badges/useBadgesSocket.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import { useAuth } from '@/core';
import { invalidateBadges } from './badgesQuery';

/** Zdarzenia leadów, które przesuwają plakietkę „Leady" - u wszystkich w studiu. */
const LEAD_BADGE_EVENTS = new Set(['NEW_LEAD', 'LEAD_STATUS_CHANGED', 'LEAD_CLIENT_REPLIED']);

/**
 * Plakietki menu na żywo przez całą sesję (montowane w Sidebarze). Poczta odświeża je
 * w useCommsSocket razem z listą wątków; tu zostają zdarzenia leadów, które wcześniej
 * nie ruszały licznika poza otwartą skrzynką - nowy lead z telefonu czekał na odświeżenie.
 */
export function useBadgesSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;
        const unsubscribe = subscribeToTopic(`/topic/studio.${user.studioId}.dashboard`, message => {
            try {
                if (LEAD_BADGE_EVENTS.has(JSON.parse(message.body)?.type)) invalidateBadges(queryClient);
            } catch {
                // Nie-JSON na topicu to nie nasza wiadomość.
            }
        });
        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (isReconnect) invalidateBadges(queryClient);
        });
        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, queryClient]);
}
