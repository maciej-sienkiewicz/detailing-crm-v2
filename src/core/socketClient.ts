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

  console.info('[STOMP] Creating client, endpoint:', WS_ENDPOINT);

  stompClient = new Client({
    // Use SockJS factory for the underlying WebSocket connection
    webSocketFactory: () => {
      console.info('[STOMP] Opening SockJS connection to', WS_ENDPOINT);
      return new SockJS(WS_ENDPOINT) as unknown as WebSocket;
    },

    // Auto-reconnect on connection loss
    reconnectDelay: RECONNECT_DELAY,

    // Heartbeat configuration for session keep-alive
    heartbeatIncoming: HEARTBEAT_INCOMING,
    heartbeatOutgoing: HEARTBEAT_OUTGOING,

    // Debug logging — all STOMP frames
    debug: (msg) => {
      console.debug('[STOMP debug]', msg);
    },

    onConnect: (frame) => {
      console.info('[STOMP] Connected successfully. Frame:', frame);
    },

    onDisconnect: (frame) => {
      console.warn('[STOMP] Disconnected. Frame:', frame);
    },

    onStompError: (frame) => {
      console.error('[STOMP] STOMP error:', frame.headers['message'], frame.body);
    },

    onWebSocketError: (event) => {
      console.error('[STOMP] WebSocket error:', event);
    },

    onWebSocketClose: (event) => {
      console.warn('[STOMP] WebSocket closed. Code:', event?.code, 'Reason:', event?.reason);
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
