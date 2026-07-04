/**
 * Dashboard WebSocket Hook
 * Manages STOMP subscription for real-time dashboard events.
 * Updates the "recent calls" section of the dashboard TanStack Query cache.
 *
 * Note: the NEW_LEAD toast is shown globally by useLeadSocket (mounted in the
 * Sidebar for the whole session), so this hook must not show its own toast —
 * both hooks listen on the same topic and doing so would double the
 * notification whenever the dashboard is open.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import { useAuth } from '@/core';
import { DASHBOARD_STATS_KEY } from './useDashboard';
import type { DashboardData, DashboardEvent, InboundCallPayload, IncomingCall } from '../types';
import { DashboardEventType } from '../types';

/**
 * Hook that subscribes to the dashboard WebSocket topic for real-time updates.
 * Automatically connects when authenticated and disconnects on cleanup.
 * After a reconnect it refetches dashboard data so nothing missed while
 * offline is lost.
 */
export function useDashboardSocket(): void {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const handleNewInboundCall = (event: DashboardEvent<InboundCallPayload>) => {
    const { payload } = event;

    // Map WebSocket payload to the IncomingCall interface. The backend event
    // uses the lead payload shape (contactIdentifier/customerName/createdAt);
    // legacy fields are kept as fallbacks.
    const newCall: IncomingCall = {
      id: payload.id,
      phoneNumber: payload.phoneNumber ?? payload.contactIdentifier ?? '',
      contactName: payload.callerName ?? payload.customerName ?? undefined,
      timestamp: payload.receivedAt ?? payload.createdAt ?? event.timestamp,
    };

    // Update TanStack Query cache optimistically
    queryClient.setQueryData<DashboardData>(
      DASHBOARD_STATS_KEY as unknown as readonly string[],
      (prev) => {
        if (!prev) return prev;
        if (prev.recentCalls.some((call) => call.id === newCall.id)) return prev;
        return {
          ...prev,
          recentCalls: [newCall, ...prev.recentCalls],
        };
      },
    );
  };

  const handleMessage = (message: IMessage) => {
    try {
      const event: DashboardEvent<unknown> = JSON.parse(message.body);

      switch (event.type) {
        case DashboardEventType.NEW_LEAD:
          handleNewInboundCall(event as DashboardEvent<InboundCallPayload>);
          break;
        default:
          console.warn('[DashboardSocket] Unknown event type:', event.type);
      }
    } catch (err) {
      console.error('[DashboardSocket] Failed to parse message:', err, 'Raw body:', message.body);
    }
  };

  // Keep the latest handler in a ref so the subscription effect below does
  // not tear down / recreate the STOMP subscription on re-renders
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  });

  useEffect(() => {
    // Only subscribe when authenticated and studioId is available
    if (!isAuthenticated || !user?.studioId) {
      return;
    }

    const topic = `/topic/studio.${user.studioId}.dashboard`;

    const unsubscribe = subscribeToTopic(topic, (message) =>
      handleMessageRef.current(message)
    );

    // Catch up on anything missed while the connection was down
    const removeConnectListener = onSocketConnect(({ isReconnect }) => {
      if (!isReconnect) return;
      queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    });

    return () => {
      unsubscribe();
      removeConnectListener();
    };
  }, [isAuthenticated, user?.studioId, queryClient]);
}
