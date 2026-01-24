/**
 * WebSocket Client (STOMP over SockJS)
 * Provides a singleton STOMP client for real-time server communication.
 */

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_ENDPOINT = '/ws-registry';
const RECONNECT_DELAY = 5000;
const HEARTBEAT_INCOMING = 10000;
const HEARTBEAT_OUTGOING = 10000;

let stompClient: Client | null = null;

/**
 * Returns the singleton STOMP client instance, creating one if it doesn't exist.
 * Uses SockJS as the transport layer for browser compatibility.
 */
export function getStompClient(): Client {
  if (stompClient) {
    return stompClient;
  }

  stompClient = new Client({
    // Use SockJS factory for the underlying WebSocket connection
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as WebSocket,

    // Auto-reconnect on connection loss
    reconnectDelay: RECONNECT_DELAY,

    // Heartbeat configuration for session keep-alive
    heartbeatIncoming: HEARTBEAT_INCOMING,
    heartbeatOutgoing: HEARTBEAT_OUTGOING,

    // Debug logging (dev only)
    debug: (msg) => {
      if (import.meta.env.DEV) {
        console.debug('[STOMP]', msg);
      }
    },

    onConnect: () => {
      if (import.meta.env.DEV) {
        console.info('[STOMP] Connected to', WS_ENDPOINT);
      }
    },

    onStompError: (frame) => {
      console.error('[STOMP] Error:', frame.headers['message'], frame.body);
    },

    onWebSocketClose: () => {
      if (import.meta.env.DEV) {
        console.warn('[STOMP] WebSocket connection closed. Reconnecting...');
      }
    },
  });

  return stompClient;
}

/**
 * Deactivates and clears the singleton STOMP client.
 * Should be called on application teardown if needed.
 */
export async function disconnectStompClient(): Promise<void> {
  if (stompClient) {
    await stompClient.deactivate();
    stompClient = null;
  }
}
