// src/modules/checkin/hooks/useCheckinSocket.ts

import { useEffect, useRef } from 'react';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import { getStompClient } from '@/core/socketClient';
import { useAuth } from '@/core';
import type { CheckinPhotoUploadedEvent } from '../types';

interface UseCheckinSocketOptions {
    checkinId: string | null;
    onPhotoUploaded: (event: CheckinPhotoUploadedEvent) => void;
    enabled?: boolean;
}

/**
 * Subscribes to the checkin WebSocket topic.
 * Calls onPhotoUploaded whenever a CHECKIN_PHOTO_UPLOADED message arrives.
 * Topic: /topic/studio.{studioId}.checkin.{checkinId}
 */
export function useCheckinSocket({
    checkinId,
    onPhotoUploaded,
    enabled = true,
}: UseCheckinSocketOptions): void {
    const { isAuthenticated, user } = useAuth();
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const onPhotoUploadedRef = useRef(onPhotoUploaded);
    onPhotoUploadedRef.current = onPhotoUploaded;

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId || !checkinId || !enabled) return;

        const studioId = user.studioId;
        const topic = `/topic/studio.${studioId}.checkin.${checkinId}`;
        const client = getStompClient();

        const handleMessage = (message: IMessage) => {
            try {
                const event = JSON.parse(message.body);
                if (event.type === 'CHECKIN_PHOTO_UPLOADED') {
                    onPhotoUploadedRef.current(event as CheckinPhotoUploadedEvent);
                }
            } catch (err) {
                console.error('[CheckinSocket] Failed to parse message:', err);
            }
        };

        const subscribe = () => {
            if (subscriptionRef.current) return;
            console.info('[CheckinSocket] Subscribing to', topic);
            subscriptionRef.current = client.subscribe(topic, handleMessage);
        };

        if (client.connected) {
            subscribe();
        }

        const originalOnConnect = client.onConnect;
        client.onConnect = (frame) => {
            originalOnConnect?.(frame);
            subscribe();
        };

        if (!client.active) {
            client.activate();
        }

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            client.onConnect = originalOnConnect;
        };
    }, [isAuthenticated, user?.studioId, checkinId, enabled]);
}
