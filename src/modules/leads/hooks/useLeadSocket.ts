// src/modules/leads/hooks/useLeadSocket.ts
/**
 * Lead WebSocket Hook
 * Manages STOMP subscription for real-time lead events.
 * Handles incoming calls and updates TanStack Query cache.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic, onSocketConnect } from '@/core/socketClient';
import { useAuth } from '@/core';
import { useToast } from '@/common/components/Toast';
import { LEADS_KEY, LEAD_PIPELINE_KEY } from './useLeads';
import type {
  Lead,
  LeadEvent,
  InboundCallPayload,
  LeadClientRepliedPayload,
  LeadListResponse,
} from '../types';
import { LeadEventType, LeadStatus } from '../types';

/**
 * Hook that subscribes to the lead WebSocket topic for real-time updates.
 * Automatically connects when authenticated and disconnects on cleanup.
 * After a reconnect it refetches lead data so events missed while offline
 * are never lost.
 */
export function useLeadSocket(): void {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { showInfo } = useToast();

  const handleNewInboundCall = useCallback(
    (event: LeadEvent<InboundCallPayload>) => {
      const { payload } = event;

      // Create new lead from WebSocket payload
      const newLead: Lead = {
        id: payload.id,
        source: payload.source,
        status: LeadStatus.IN_PROGRESS,
        contactIdentifier: payload.contactIdentifier,
        customerName: payload.customerName ?? undefined,
        createdAt: payload.createdAt,
        updatedAt: payload.createdAt,
        estimatedValue: payload.estimatedValue,
        estimationStatus: 'PENDING',
        requiresVerification: true,
        relatedVisits: [],
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

      // Refetch from the server so filtered/sorted lists converge to the
      // real state (the optimistic entry only approximates the new lead)
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });

      // Show toast notification
      const contact = payload.customerName ?? payload.contactIdentifier;
      showInfo('Pojawił się nowy kontakt klienta', contact);
    },
    [queryClient, showInfo]
  );

  const handleLeadUpdated = useCallback(
    (event: LeadEvent<Lead>) => {
      const updatedLead = event.payload;

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

  const handleReplyAppended = useCallback(
    (event: LeadEvent<Lead>) => {
      const updatedLead = event.payload;

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

      queryClient.invalidateQueries({ queryKey: LEAD_PIPELINE_KEY });

      const contact = updatedLead.customerName || updatedLead.contactIdentifier;
      showInfo('Nowa odpowiedź od klienta', contact);
    },
    [queryClient, showInfo]
  );

  const handleLeadClientReplied = useCallback(
    (event: LeadEvent<LeadClientRepliedPayload>) => {
      const { leadId, activityAt, customerName } = event.payload;

      // Mark the lead as having unread activity in the list cache
      queryClient.setQueriesData<LeadListResponse>(
        { queryKey: [...LEADS_KEY, 'list'] },
        (old) => {
          if (!old) return old;
          const lead = old.leads.find((l) => l.id === leadId);
          if (!lead) return old;
          return {
            ...old,
            leads: old.leads.map((l) =>
              l.id === leadId ? { ...l, newActivityAt: activityAt } : l
            ),
          };
        }
      );

      // Also refresh the detail query if it's cached (modal might be open)
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });

      const who = customerName?.trim() || 'Klient';
      showInfo(`${who} odpisał na zapytanie`, 'Nowa wiadomość w skrzynce leadów');
    },
    [queryClient, showInfo]
  );

  const handleMessage = useCallback(
    (message: IMessage) => {
      try {
        const event: LeadEvent<unknown> = JSON.parse(message.body);

        switch (event.type) {
          case LeadEventType.NEW_LEAD:
            handleNewInboundCall(event as LeadEvent<InboundCallPayload>);
            break;
          case LeadEventType.LEAD_UPDATED:
          case LeadEventType.LEAD_STATUS_CHANGED:
            handleLeadUpdated(event as LeadEvent<Lead>);
            break;
          case LeadEventType.REPLY_APPENDED:
            handleReplyAppended(event as LeadEvent<Lead>);
            break;
          case LeadEventType.LEAD_CLIENT_REPLIED:
            handleLeadClientReplied(event as LeadEvent<LeadClientRepliedPayload>);
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
    [handleNewInboundCall, handleLeadUpdated, handleReplyAppended, handleLeadClientReplied]
  );

  // Keep the latest handler in a ref so the subscription effect below does
  // not tear down / recreate the STOMP subscription on re-renders
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    // Only subscribe when authenticated and studioId is available
    if (!isAuthenticated || !user?.studioId) {
      return;
    }

    const topic = `/topic/studio.${user.studioId}.dashboard`;

    const unsubscribe = subscribeToTopic(topic, (message) =>
      handleMessageRef.current(message)
    );

    // Events sent while the connection was down are gone — after every
    // reconnect refetch lead data so the UI catches up without a page reload
    const removeConnectListener = onSocketConnect(({ isReconnect }) => {
      if (!isReconnect) return;
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    });

    return () => {
      unsubscribe();
      removeConnectListener();
    };
  }, [isAuthenticated, user?.studioId, queryClient]);
}
