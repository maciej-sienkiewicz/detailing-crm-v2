// src/modules/checkin/hooks/useCheckinSocket.ts

import { useEffect, useRef } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import { useAuth } from '@/core';
import { normalisePhoneDamagePoints } from '../utils/phoneDamage';
import type { CheckinPhotoUploadedEvent, CheckinDamageUpdatedEvent } from '../types';

interface UseCheckinSocketOptions {
    checkinId: string | null;
    onPhotoUploaded: (event: CheckinPhotoUploadedEvent) => void;
    onDamageUpdated?: (event: CheckinDamageUpdatedEvent) => void;
    /**
     * Po ponownym połączeniu: zdarzenia z czasu przerwy nie przyjdą już nigdy, więc
     * wywołujący dociąga stan z serwera. Samo odnowienie subskrypcji tego nie załatwia.
     */
    onReconnect?: () => void;
    enabled?: boolean;
}

/**
 * Subscribes to the checkin WebSocket topic.
 * Dispatches CHECKIN_PHOTO_UPLOADED and CHECKIN_DAMAGE_UPDATED messages
 * to their respective callbacks. The subscription survives reconnects
 * (handled centrally by the socket client); [onReconnect] lets the caller re-sync.
 * Topic: /topic/studio.{studioId}.checkin.{checkinId}
 */
export function useCheckinSocket({
    checkinId,
    onPhotoUploaded,
    onDamageUpdated,
    onReconnect,
    enabled = true,
}: UseCheckinSocketOptions): void {
    const { isAuthenticated, user } = useAuth();
    const onPhotoUploadedRef = useRef(onPhotoUploaded);
    const onDamageUpdatedRef = useRef(onDamageUpdated);
    const onReconnectRef = useRef(onReconnect);
    useEffect(() => {
        onPhotoUploadedRef.current = onPhotoUploaded;
        onDamageUpdatedRef.current = onDamageUpdated;
        onReconnectRef.current = onReconnect;
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
                    // Ta sama normalizacja co przy odczycie z serwera (CheckinQRGenerator):
                    // obie drogi muszą dać formularzowi identyczny kształt, ze zdjęciami.
                    const normalised: CheckinDamageUpdatedEvent = {
                        ...event,
                        damagePoints: normalisePhoneDamagePoints(event.damagePoints),
                    };
                    onDamageUpdatedRef.current?.(normalised);
                }
            } catch {
                // TODO: handled error silently
            }
        };

        const unsubscribe = subscribeToTopic(topic, handleMessage);
        const removeConnectListener = onSocketConnect(({ isReconnect }) => {
            if (isReconnect) onReconnectRef.current?.();
        });

        return () => {
            unsubscribe();
            removeConnectListener();
        };
    }, [isAuthenticated, user?.studioId, checkinId, enabled]);
}
