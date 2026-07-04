/**
 * WebSocket Client (STOMP over SockJS)
 *
 * Central connection manager for real-time server communication.
 * Owns a single STOMP client shared by every feature hook and solves the
 * problems a raw shared client has:
 *
 * - STOMP subscriptions do NOT survive a reconnect. The manager keeps a
 *   registry of requested subscriptions and re-establishes every one of them
 *   each time the connection is (re)opened.
 * - `client.onConnect` is owned exclusively by this module. Feature code must
 *   never overwrite callbacks on the shared client; it registers listeners
 *   through `onSocketConnect()` instead.
 * - The connection stays up as long as at least one subscription is
 *   registered. It is torn down explicitly on logout via
 *   `disconnectStompClient()`.
 * - Heartbeats run in a Web Worker so background-tab timer throttling does
 *   not silently kill the session, and when the tab becomes visible again a
 *   stale connection is re-established immediately instead of waiting for
 *   the reconnect timer.
 */

import { Client, TickerStrategy } from '@stomp/stompjs';
import type { IMessage, IStompSocket, StompSubscription, messageCallbackType } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_ENDPOINT = '/ws-registry';
const RECONNECT_DELAY = 3000;
const HEARTBEAT_INCOMING = 10000;
const HEARTBEAT_OUTGOING = 10000;

export interface SocketConnectContext {
  /** true when this is a re-connection after a lost session (events may have been missed) */
  isReconnect: boolean;
}

type SocketConnectListener = (ctx: SocketConnectContext) => void;

interface TopicRegistration {
  destination: string;
  onMessage: messageCallbackType;
  subscription: StompSubscription | null;
}

let stompClient: Client | null = null;
let hasConnectedOnce = false;
let visibilityHandlerInstalled = false;

const topicRegistry = new Set<TopicRegistration>();
const connectListeners = new Set<SocketConnectListener>();

function log(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.info('[STOMP]', ...args);
  }
}

function resubscribeAll(client: Client): void {
  for (const registration of topicRegistry) {
    // Old subscription handles are invalid after a reconnect — always resubscribe
    registration.subscription = client.subscribe(
      registration.destination,
      registration.onMessage
    );
  }
}

function ensureClient(): Client {
  if (stompClient) {
    return stompClient;
  }

  stompClient = new Client({
    // SockJS transport for browser/proxy compatibility (falls back to
    // xhr-streaming/polling when a proxy blocks the websocket upgrade)
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as IStompSocket,

    reconnectDelay: RECONNECT_DELAY,

    heartbeatIncoming: HEARTBEAT_INCOMING,
    heartbeatOutgoing: HEARTBEAT_OUTGOING,
    // Web-Worker heartbeats keep the session alive in throttled background tabs
    heartbeatStrategy: TickerStrategy.Worker,

    debug: (msg) => {
      if (import.meta.env.DEV) {
        console.debug('[STOMP debug]', msg);
      }
    },

    onConnect: () => {
      const isReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      log(isReconnect ? 'Reconnected' : 'Connected');

      resubscribeAll(stompClient!);

      for (const listener of connectListeners) {
        try {
          listener({ isReconnect });
        } catch (err) {
          console.error('[STOMP] Connect listener failed:', err);
        }
      }
    },

    onStompError: (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
    },

    onWebSocketClose: (event) => {
      log('WebSocket closed. Code:', event?.code, 'Reason:', event?.reason);
      // Subscription handles are dead now; they will be recreated on reconnect
      for (const registration of topicRegistry) {
        registration.subscription = null;
      }
    },
  });

  installVisibilityHandler();

  return stompClient;
}

/**
 * When a backgrounded tab becomes visible again its connection may have been
 * dropped (OS sleep, network change, aggressive throttling). Instead of
 * waiting for heartbeat detection + reconnect timer, nudge the client to
 * reconnect immediately so the user sees fresh data right away.
 */
function installVisibilityHandler(): void {
  if (visibilityHandlerInstalled || typeof document === 'undefined') {
    return;
  }
  visibilityHandlerInstalled = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const client = stompClient;
    if (client && client.active && !client.connected) {
      log('Tab visible with stale connection — forcing immediate reconnect');
      void client.deactivate().then(() => {
        // Only reactivate if something still wants the connection
        if (topicRegistry.size > 0) {
          client.activate();
        }
      });
    }
  });
}

/**
 * Subscribes to a STOMP destination. The subscription is automatically
 * re-established after every reconnect and the underlying connection is
 * started on demand.
 *
 * @returns cleanup function that removes the subscription
 */
export function subscribeToTopic(
  destination: string,
  onMessage: (message: IMessage) => void
): () => void {
  const registration: TopicRegistration = {
    destination,
    onMessage,
    subscription: null,
  };
  topicRegistry.add(registration);

  const client = ensureClient();

  if (client.connected) {
    registration.subscription = client.subscribe(destination, onMessage);
  }

  if (!client.active) {
    log('Activating client for', destination);
    client.activate();
  }

  return () => {
    topicRegistry.delete(registration);
    if (registration.subscription && client.connected) {
      try {
        registration.subscription.unsubscribe();
      } catch (err) {
        log('Unsubscribe failed (connection likely already closed):', err);
      }
    }
    registration.subscription = null;
  };
}

/**
 * Registers a listener invoked every time the STOMP session is established.
 * `ctx.isReconnect` distinguishes the first connect from later re-connects,
 * so callers can refetch data that may have changed while offline.
 *
 * @returns cleanup function that removes the listener
 */
export function onSocketConnect(listener: SocketConnectListener): () => void {
  connectListeners.add(listener);
  return () => {
    connectListeners.delete(listener);
  };
}

/**
 * Deactivates and clears the singleton STOMP client.
 * Must be called on logout so subscriptions bound to the previous
 * user/studio do not leak into the next session.
 */
export async function disconnectStompClient(): Promise<void> {
  const client = stompClient;
  stompClient = null;
  hasConnectedOnce = false;
  topicRegistry.clear();

  if (client) {
    try {
      await client.deactivate();
    } catch (err) {
      log('Deactivate failed:', err);
    }
  }
}
