/**
 * Dashboard WebSocket Hook
 * Manages STOMP subscription for real-time dashboard events.
 * Handles incoming call notifications and updates TanStack Query cache.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import { getStompClient } from '@/core/socketClient';
import { useAuth } from '@/core';
import { useToast } from '@/common/components/Toast';
import { DASHBOARD_STATS_KEY } from './useDashboard';
import type { DashboardData, DashboardEvent, InboundCallPayload, IncomingCall } from '../types';
import { DashboardEventType } from '../types';

/**
 * Hook that subscribes to the dashboard WebSocket topic for real-time updates.
 * Automatically connects when authenticated and disconnects on cleanup.
 */
export function useDashboardSocket(): void {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { showInfo } = useToast();
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    // Only subscribe when authenticated and studioId is available
    if (!isAuthenticated || !user?.studioId) {
      return;
    }

    const studioId = user.studioId;
    const topic = `/topic/studio.${studioId}.dashboard`;
    const client = getStompClient();

    const handleMessage = (message: IMessage) => {
      try {
        const event: DashboardEvent<unknown> = JSON.parse(message.body);

        switch (event.type) {
          case DashboardEventType.NEW_INBOUND_CALL:
            handleNewInboundCall(event as DashboardEvent<InboundCallPayload>);
            break;
          default:
            if (import.meta.env.DEV) {
              console.warn('[DashboardSocket] Unknown event type:', event.type);
            }
        }
      } catch (err) {
        console.error('[DashboardSocket] Failed to parse message:', err);
      }
    };

    const handleNewInboundCall = (event: DashboardEvent<InboundCallPayload>) => {
      const { payload } = event;

      // Map WebSocket payload to existing IncomingCall interface
      const newCall: IncomingCall = {
        id: payload.id,
        phoneNumber: payload.phoneNumber,
        contactName: payload.callerName,
        timestamp: payload.receivedAt,
      };

      // Update TanStack Query cache optimistically
      queryClient.setQueryData<DashboardData>(
        DASHBOARD_STATS_KEY as unknown as readonly string[],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            recentCalls: [newCall, ...prev.recentCalls],
          };
        },
      );

      // Show toast notification
      showInfo('Nowe połączenie', payload.phoneNumber);
    };

    const subscribe = () => {
      if (subscriptionRef.current) return;

      subscriptionRef.current = client.subscribe(topic, handleMessage);

      if (import.meta.env.DEV) {
        console.info('[DashboardSocket] Subscribed to', topic);
      }
    };

    // If client is already connected, subscribe immediately
    if (client.connected) {
      subscribe();
      connectedRef.current = true;
    }

    // Set up onConnect callback for (re)connections
    const originalOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      originalOnConnect?.(frame);
      connectedRef.current = true;
      subscribe();
    };

    // Activate the client if not already active
    if (!client.active) {
      client.activate();
    }

    // Cleanup: unsubscribe and restore original callback
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;

        if (import.meta.env.DEV) {
          console.info('[DashboardSocket] Unsubscribed from', topic);
        }
      }

      client.onConnect = originalOnConnect;

      // Deactivate client when dashboard unmounts
      if (client.active) {
        client.deactivate();
        connectedRef.current = false;
      }
    };
  }, [isAuthenticated, user?.studioId, queryClient, showInfo]);
}
