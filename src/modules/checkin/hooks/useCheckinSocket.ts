// src/modules/checkin/hooks/useCheckinSocket.ts

import { useEffect, useRef } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import type { AnnotationStroke, CheckinPhotoUploadedEvent, CheckinDamageUpdatedEvent } from '../types';

/** Usterka w kształcie wiadomości WS (CheckinDamageUpdatedWsMessage po stronie serwera). */
interface WsDamagePoint {
    id: number;
    x: number;
    y: number;
    note?: string | null;
    photos?: { photoId: string; thumbnailUrl?: string | null; strokes?: AnnotationStroke[] }[];
}

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
                    // Normalise note: null → '' to match frontend DamagePoint type.
                    // Zdjęcia usterek MUSZĄ przejść dalej: dawniej ta normalizacja
                    // wypisywała tylko id, x, y i notatkę, więc usterka z telefonu
                    // przychodziła na komputer bez zdjęć, a podgląd oznaczeń na zdjęciach
                    // z telefonu nie miał z czego się zbudować.
                    const normalised: CheckinDamageUpdatedEvent = {
                        ...event,
                        damagePoints: (event.damagePoints ?? []).map((p: WsDamagePoint) => ({
                            id: p.id,
                            x: p.x,
                            y: p.y,
                            note: p.note ?? '',
                            photos: (p.photos ?? []).map(photo => ({
                                photoId: photo.photoId,
                                strokes: photo.strokes ?? [],
                                thumbnailUrl: photo.thumbnailUrl ?? undefined,
                            })),
                        })),
                    };
                    onDamageUpdatedRef.current?.(normalised);
                }
            } catch {
                // TODO: handled error silently
            }
        };

        return subscribeToTopic(topic, handleMessage);
    }, [isAuthenticated, user?.studioId, checkinId, enabled]);
}
