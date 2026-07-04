// src/modules/checkin/hooks/useCheckinSocket.ts

import { useEffect, useRef } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import type { CheckinPhotoUploadedEvent, CheckinDamageUpdatedEvent } from '../types';

interface UseCheckinSocketOptions {
    checkinId: string | null;
    onPhotoUploaded: (event: CheckinPhotoUploadedEvent) => void;
    onDamageUpdated?: (event: CheckinDamageUpdatedEvent) => void;
    enabled?: boolean;
}

/**
 * Subscribes to the checkin WebSocket topic.
 * Dispatches CHECKIN_PHOTO_UPLOADED and CHECKIN_DAMAGE_UPDATED messages
 * to their respective callbacks. The subscription survives reconnects
 * (handled centrally by the socket client).
 * Topic: /topic/studio.{studioId}.checkin.{checkinId}
 */
export function useCheckinSocket({
    checkinId,
    onPhotoUploaded,
    onDamageUpdated,
    enabled = true,
}: UseCheckinSocketOptions): void {
    const { isAuthenticated, user } = useAuth();
    const onPhotoUploadedRef = useRef(onPhotoUploaded);
    const onDamageUpdatedRef = useRef(onDamageUpdated);
    useEffect(() => {
        onPhotoUploadedRef.current = onPhotoUploaded;
        onDamageUpdatedRef.current = onDamageUpdated;
    });

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId || !checkinId || !enabled) return;

        const topic = `/topic/studio.${user.studioId}.checkin.${checkinId}`;

        const handleMessage = (message: IMessage) => {
            try {
                const event = JSON.parse(message.body);
                if (event.type === 'CHECKIN_PHOTO_UPLOADED') {
                    onPhotoUploadedRef.current(event as CheckinPhotoUploadedEvent);
                } else if (event.type === 'CHECKIN_DAMAGE_UPDATED') {
                    // Normalise note: null → '' to match frontend DamagePoint type
                    const normalised: CheckinDamageUpdatedEvent = {
                        ...event,
                        damagePoints: (event.damagePoints ?? []).map((p: { id: number; x: number; y: number; note?: string | null }) => ({
                            id: p.id,
                            x: p.x,
                            y: p.y,
                            note: p.note ?? '',
                        })),
                    };
                    onDamageUpdatedRef.current?.(normalised);
                }
            } catch (err) {
                console.error('[CheckinSocket] Failed to parse message:', err);
            }
        };

        return subscribeToTopic(topic, handleMessage);
    }, [isAuthenticated, user?.studioId, checkinId, enabled]);
}
