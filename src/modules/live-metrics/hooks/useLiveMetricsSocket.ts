// src/modules/live-metrics/hooks/useLiveMetricsSocket.ts
/**
 * Subskrypcja STOMP metryk na żywo.
 *
 * Backend rozgłasza każde zdarzenie biznesowe na `/topic/studio.{studioId}.metrics`
 * dopiero po odczytaniu go ze strumienia Redis, więc ramka dociera także wtedy, gdy
 * zapisała ją inna instancja aplikacji. Ramki `HEARTBEAT` istnieją tylko po to, żeby
 * kanał SSE nie zasnął za proxy — tutaj są ignorowane.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { onSocketConnect, subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import { LIVE_METRICS_OVERVIEW_KEY } from './useLiveMetrics';
import { applyLiveEvent } from './applyLiveEvent';
import type { LiveMetricsFrame, LiveMetricsOverview } from '../types';

export interface LiveMetricsSocketState {
    /** Czy od zamontowania widoku dotarła choć jedna ramka. */
    isLive: boolean;
    /** Znacznik ostatniego zdarzenia — nagłówek pokazuje po nim „ostatnie: 12:04". */
    lastEventAt: string | null;
}

export function useLiveMetricsSocket(): LiveMetricsSocketState {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const [state, setState] = useState<LiveMetricsSocketState>({ isLive: false, lastEventAt: null });

    const handleFrame = useCallback(
        (message: IMessage) => {
            let frame: LiveMetricsFrame;
            try {
                frame = JSON.parse(message.body) as LiveMetricsFrame;
            } catch {
                return;
            }
            if (frame.kind !== 'BUSINESS_EVENT' || !frame.event) return;

            const event = frame.event;
            queryClient.setQueryData<LiveMetricsOverview>(LIVE_METRICS_OVERVIEW_KEY, (previous) =>
                previous ? applyLiveEvent(previous, event) : previous,
            );
            setState({ isLive: true, lastEventAt: event.occurredAt });
        },
        [queryClient],
    );

    // Handler w refie: subskrypcja STOMP nie może być zrywana przy każdym renderze.
    const handlerRef = useRef(handleFrame);
    useEffect(() => {
        handlerRef.current = handleFrame;
    }, [handleFrame]);

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;

        const topic = `/topic/studio.${user.studioId}.metrics`;
        const unsubscribe = subscribeToTopic(topic, (message) => handlerRef.current(message));

        // Po zerwaniu połączenia liczniki w cache'u są niepełne — pełna migawka
        // z serwera jest jedynym sposobem, żeby to naprawić.
        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (!isReconnect) return;
            void queryClient.invalidateQueries({ queryKey: LIVE_METRICS_OVERVIEW_KEY });
        });

        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, queryClient]);

    return state;
}
