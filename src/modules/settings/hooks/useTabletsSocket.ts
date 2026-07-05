import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import type { IMessage } from '@stomp/stompjs';
import type { TabletSocketEvent } from '../tabletTypes';
import { TABLETS_KEY } from './useTablets';

interface TabletSocketHandlers {
    onPaired: (event: TabletSocketEvent) => void;
    onRevoked: (event: TabletSocketEvent) => void;
}

export function useTabletsSocket(handlers: TabletSocketHandlers): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; });

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;

        const topic = `/topic/studio.${user.studioId}.tablets`;

        const unsubscribe = subscribeToTopic(topic, (msg: IMessage) => {
            try {
                const event = JSON.parse(msg.body) as TabletSocketEvent;
                if (event.type === 'TABLET_PAIRED') {
                    handlersRef.current.onPaired(event);
                } else if (event.type === 'TABLET_REVOKED') {
                    handlersRef.current.onRevoked(event);
                }
            } catch (err) {
                console.error('[TabletsSocket] Failed to parse message:', err);
            }
        });

        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (!isReconnect) return;
            queryClient.invalidateQueries({ queryKey: TABLETS_KEY });
        });

        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, queryClient]);
}
