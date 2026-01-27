// src/modules/leads/hooks/useLeadSocket.ts
/**
 * Lead WebSocket Hook
 * Manages STOMP subscription for real-time lead events.
 * Handles incoming calls and updates TanStack Query cache.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import { getStompClient } from '@/core/socketClient';
import { useAuth } from '@/core';
import { useToast } from '@/common/components/Toast';
import { LEADS_KEY, LEAD_PIPELINE_KEY } from './useLeads';
import type {
  Lead,
  LeadEvent,
  InboundCallPayload,
  LeadListResponse,
} from '../types';
import { LeadEventType, LeadSource, LeadStatus } from '../types';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';

/**
 * Hook that subscribes to the lead WebSocket topic for real-time updates.
 * Automatically connects when authenticated and disconnects on cleanup.
 */
export function useLeadSocket(): void {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { showInfo } = useToast();
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const connectedRef = useRef(false);

  const handleNewInboundCall = useCallback(
    (event: LeadEvent<InboundCallPayload>) => {
      const { payload } = event;
      console.info('[LeadSocket] NEW_INBOUND_CALL payload:', payload);

      // Create new lead from WebSocket payload
      const newLead: Lead = {
        id: payload.id,
        source: LeadSource.PHONE,
        status: LeadStatus.IN_PROGRESS,
        contactIdentifier: payload.phoneNumber,
        customerName: payload.callerName,
        createdAt: payload.receivedAt,
        updatedAt: payload.receivedAt,
        estimatedValue: payload.estimatedValue,
        requiresVerification: true, // Phone calls always require verification
      };

      // Update TanStack Query cache optimistically
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) {
            return {
              leads: [newLead],
              pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 1,
                itemsPerPage: 20,
              },
            };
          }

          // Check if lead already exists (prevent duplicates)
          const exists = old.leads.some((l) => l.id === newLead.id);
          if (exists) return old;

          // Add to the beginning of the list
          return {
            ...old,
            leads: [newLead, ...old.leads],
            pagination: {
              ...old.pagination,
              totalItems: old.pagination.totalItems + 1,
            },
          };
        }
      );

      // Invalidate pipeline summary to recalculate
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });

      // Show toast notification with formatted value
      const formattedPhone = formatPhoneNumber(payload.phoneNumber);
      const formattedValue = formatCurrency(payload.estimatedValue);
      showInfo(
        'Nowe połączenie przychodzące',
        `${formattedPhone} - Szac. wartość: ${formattedValue}`
      );
    },
    [queryClient, showInfo]
  );

  const handleLeadUpdated = useCallback(
    (event: LeadEvent<Lead>) => {
      const updatedLead = event.payload;
      console.info('[LeadSocket] LEAD_UPDATED payload:', updatedLead);

      // Update the lead in cache
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            leads: old.leads.map((lead) =>
              lead.id === updatedLead.id ? updatedLead : lead
            ),
          };
        }
      );

      // Invalidate pipeline summary
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });
    },
    [queryClient]
  );

  const handleMessage = useCallback(
    (message: IMessage) => {
      console.info('[LeadSocket] Raw message received:', message.body);

      try {
        const event: LeadEvent<unknown> = JSON.parse(message.body);
        console.info('[LeadSocket] Parsed event:', event.type, event);

        switch (event.type) {
          case LeadEventType.NEW_INBOUND_CALL:
            handleNewInboundCall(event as LeadEvent<InboundCallPayload>);
            break;
          case LeadEventType.LEAD_UPDATED:
          case LeadEventType.LEAD_STATUS_CHANGED:
            handleLeadUpdated(event as LeadEvent<Lead>);
            break;
          default:
            console.warn('[LeadSocket] Unknown event type:', event.type);
        }
      } catch (err) {
        console.error(
          '[LeadSocket] Failed to parse message:',
          err,
          'Raw body:',
          message.body
        );
      }
    },
    [handleNewInboundCall, handleLeadUpdated]
  );

  useEffect(() => {
    console.info(
      '[LeadSocket] Hook effect fired. isAuthenticated:',
      isAuthenticated,
      'studioId:',
      user?.studioId
    );

    // Only subscribe when authenticated and studioId is available
    if (!isAuthenticated || !user?.studioId) {
      console.warn('[LeadSocket] Skipping — not authenticated or no studioId');
      return;
    }

    const studioId = user.studioId;
    // Subscribe to the dashboard topic (same as existing dashboard socket)
    const topic = `/topic/studio.${studioId}.dashboard`;
    console.info('[LeadSocket] Will subscribe to topic:', topic);
    const client = getStompClient();

    const subscribe = () => {
      if (subscriptionRef.current) {
        console.info('[LeadSocket] Already subscribed, skipping');
        return;
      }

      console.info('[LeadSocket] Subscribing to', topic);
      subscriptionRef.current = client.subscribe(topic, handleMessage);
      console.info('[LeadSocket] Subscription ID:', subscriptionRef.current.id);
    };

    // If client is already connected, subscribe immediately
    console.info(
      '[LeadSocket] Client state — connected:',
      client.connected,
      'active:',
      client.active
    );
    if (client.connected) {
      subscribe();
      connectedRef.current = true;
    }

    // Set up onConnect callback for (re)connections
    const originalOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      console.info('[LeadSocket] onConnect callback fired. Frame:', frame);
      originalOnConnect?.(frame);
      connectedRef.current = true;
      subscribe();
    };

    // Activate the client if not already active
    if (!client.active) {
      console.info('[LeadSocket] Activating STOMP client...');
      client.activate();
    } else {
      console.info('[LeadSocket] Client already active');
    }

    // Cleanup: unsubscribe and restore original callback
    return () => {
      console.info('[LeadSocket] Cleanup — unsubscribing');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      client.onConnect = originalOnConnect;

      // Note: We don't deactivate the client here as other hooks might be using it
    };
  }, [isAuthenticated, user?.studioId, handleMessage]);
}
