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
    console.info('[DashboardSocket] Hook effect fired. isAuthenticated:', isAuthenticated, 'studioId:', user?.studioId);

    // Only subscribe when authenticated and studioId is available
    if (!isAuthenticated || !user?.studioId) {
      console.warn('[DashboardSocket] Skipping — not authenticated or no studioId');
      return;
    }

    const studioId = user.studioId;
    const topic = `/topic/studio.${studioId}.dashboard`;
    console.info('[DashboardSocket] Will subscribe to topic:', topic);
    const client = getStompClient();

    const handleMessage = (message: IMessage) => {
      console.info('[DashboardSocket] Raw message received:', message.body);
      console.info('[DashboardSocket] Message headers:', message.headers);
      try {
        const event: DashboardEvent<unknown> = JSON.parse(message.body);
        console.info('[DashboardSocket] Parsed event:', event.type, event);

        switch (event.type) {
          case DashboardEventType.NEW_INBOUND_CALL:
            handleNewInboundCall(event as DashboardEvent<InboundCallPayload>);
            break;
          default:
            console.warn('[DashboardSocket] Unknown event type:', event.type);
        }
      } catch (err) {
        console.error('[DashboardSocket] Failed to parse message:', err, 'Raw body:', message.body);
      }
    };

    const handleNewInboundCall = (event: DashboardEvent<InboundCallPayload>) => {
      const { payload } = event;
      console.info('[DashboardSocket] NEW_INBOUND_CALL payload:', payload);

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
          console.info('[DashboardSocket] Updating query cache. Previous recentCalls count:', prev?.recentCalls?.length ?? 0);
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
      if (subscriptionRef.current) {
        console.info('[DashboardSocket] Already subscribed, skipping');
        return;
      }

      console.info('[DashboardSocket] Subscribing to', topic);
      subscriptionRef.current = client.subscribe(topic, handleMessage);
      console.info('[DashboardSocket] Subscription ID:', subscriptionRef.current.id);
    };

    // If client is already connected, subscribe immediately
    console.info('[DashboardSocket] Client state — connected:', client.connected, 'active:', client.active);
    if (client.connected) {
      subscribe();
      connectedRef.current = true;
    }

    // Set up onConnect callback for (re)connections
    const originalOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      console.info('[DashboardSocket] onConnect callback fired. Frame:', frame);
      originalOnConnect?.(frame);
      connectedRef.current = true;
      subscribe();
    };

    // Activate the client if not already active
    if (!client.active) {
      console.info('[DashboardSocket] Activating STOMP client...');
      client.activate();
    } else {
      console.info('[DashboardSocket] Client already active');
    }

    // Cleanup: unsubscribe and restore original callback
    return () => {
      console.info('[DashboardSocket] Cleanup — unsubscribing and deactivating');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
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
