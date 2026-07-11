import { useEffect, useRef } from 'react';
import { useAuth } from '@/core';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import type { IMessage } from '@stomp/stompjs';

/**
 * Live status message for a signing session, published by the backend on
 * /topic/studio.{studioId}.signature.{requestId}
 * (see SignatureEventPublisher on the backend).
 */
export interface SignatureRequestSocketEvent {
    type:
        | 'SIGNATURE_REQUESTED'
        | 'SIGNATURE_DISPLAYED'
        | 'SIGNATURE_COMPLETED'
        | 'SIGNATURE_DECLINED'
        | 'SIGNATURE_CANCELLED'
        | 'SIGNATURE_FAILED'
        | string;
    requestId: string;
    tabletId: string | null;
    documentName: string | null;
    signerName: string | null;
    status: string | null;
    /** Human-readable reason; set for SIGNATURE_FAILED / SIGNATURE_DECLINED. */
    errorMessage: string | null;
    occurredAt: string;
}

interface SignatureRequestsSocketHandlers {
    onEvent: (event: SignatureRequestSocketEvent) => void;
    /**
     * Called after the socket reconnects — events may have been missed while
     * offline, so callers should re-fetch the state of every awaited request.
     */
    onReconnect?: () => void;
}

/**
 * Subscribes to the live status topic of every awaited signature request.
 * Subscriptions follow the requestIds array: new ids are subscribed, removed
 * ids are unsubscribed, and everything is re-established after a reconnect
 * (handled by the shared socket client).
 */
export function useSignatureRequestsSocket(
    requestIds: string[],
    handlers: SignatureRequestsSocketHandlers,
): void {
    const { isAuthenticated, user } = useAuth();
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; });

    // Stable key so the effect only re-runs when the set of requests changes
    const requestIdsKey = [...requestIds].sort().join(',');

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId || !requestIdsKey) return;

        const ids = requestIdsKey.split(',');
        const unsubscribes = ids.map(requestId =>
            subscribeToTopic(`/topic/studio.${user.studioId}.signature.${requestId}`, (msg: IMessage) => {
                try {
                    const event = JSON.parse(msg.body) as SignatureRequestSocketEvent;
                    handlersRef.current.onEvent(event);
                } catch (err) {
                    console.error('[SignatureRequestsSocket] Failed to parse message:', err);
                }
            })
        );

        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (!isReconnect) return;
            handlersRef.current.onReconnect?.();
        });

        return () => {
            unsubscribes.forEach(unsubscribe => unsubscribe());
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, requestIdsKey]);
}
