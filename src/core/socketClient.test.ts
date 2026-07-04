// src/core/socketClient.test.ts
/**
 * Tests for the STOMP connection manager.
 * The critical behaviour under test: subscriptions MUST be re-established
 * after every reconnect (STOMP subscriptions do not survive a dropped
 * connection) and connect listeners must be able to distinguish the first
 * connect from a reconnect so they can refetch missed data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

interface MockClientInstance {
  config: Record<string, unknown>;
  connected: boolean;
  active: boolean;
  activate: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  fireConnect: () => void;
  fireWebSocketClose: () => void;
}

const clientInstances: MockClientInstance[] = [];

vi.mock('@stomp/stompjs', () => {
  class Client {
    connected = false;
    active = false;
    activate = vi.fn(() => {
      (this as unknown as MockClientInstance).active = true;
    });
    deactivate = vi.fn(async () => {
      (this as unknown as MockClientInstance).active = false;
      (this as unknown as MockClientInstance).connected = false;
    });
    subscribe = vi.fn(() => ({
      id: `sub-${Math.random()}`,
      unsubscribe: vi.fn(),
    }));
    config: Record<string, unknown>;

    constructor(config: Record<string, unknown>) {
      this.config = config;
      clientInstances.push(this as unknown as MockClientInstance);
    }

    fireConnect() {
      this.connected = true;
      (this.config.onConnect as (frame: unknown) => void)({});
    }

    fireWebSocketClose() {
      this.connected = false;
      (this.config.onWebSocketClose as (event: unknown) => void)({ code: 1006 });
    }
  }

  return {
    Client,
    TickerStrategy: { Worker: 'worker', Interval: 'interval' },
  };
});

vi.mock('sockjs-client', () => ({ default: vi.fn() }));

async function loadModule() {
  vi.resetModules();
  clientInstances.length = 0;
  return import('./socketClient');
}

const lastClient = (): MockClientInstance => {
  expect(clientInstances.length).toBeGreaterThan(0);
  return clientInstances[clientInstances.length - 1];
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('socketClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activates the client and subscribes once connected', async () => {
    const { subscribeToTopic } = await loadModule();
    const onMessage = vi.fn();

    subscribeToTopic('/topic/studio.1.dashboard', onMessage);

    const client = lastClient();
    expect(client.activate).toHaveBeenCalledTimes(1);
    // Not connected yet — subscription happens in onConnect
    expect(client.subscribe).not.toHaveBeenCalled();

    client.fireConnect();
    expect(client.subscribe).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith('/topic/studio.1.dashboard', onMessage);
  });

  it('subscribes immediately when the client is already connected', async () => {
    const { subscribeToTopic } = await loadModule();
    subscribeToTopic('/topic/a', vi.fn());
    const client = lastClient();
    client.fireConnect();

    const onMessage = vi.fn();
    subscribeToTopic('/topic/b', onMessage);
    expect(client.subscribe).toHaveBeenCalledWith('/topic/b', onMessage);
  });

  it('re-establishes every registered subscription after a reconnect', async () => {
    const { subscribeToTopic } = await loadModule();
    const onMessageA = vi.fn();
    const onMessageB = vi.fn();
    subscribeToTopic('/topic/a', onMessageA);
    subscribeToTopic('/topic/b', onMessageB);

    const client = lastClient();
    client.fireConnect();
    expect(client.subscribe).toHaveBeenCalledTimes(2);

    // Connection drops and comes back — both topics must be resubscribed
    client.fireWebSocketClose();
    client.fireConnect();

    expect(client.subscribe).toHaveBeenCalledTimes(4);
    const subscribedTopics = client.subscribe.mock.calls.map((call) => call[0]);
    expect(subscribedTopics.filter((t) => t === '/topic/a')).toHaveLength(2);
    expect(subscribedTopics.filter((t) => t === '/topic/b')).toHaveLength(2);
  });

  it('does not resubscribe topics that were unsubscribed before the reconnect', async () => {
    const { subscribeToTopic } = await loadModule();
    const unsubscribeA = subscribeToTopic('/topic/a', vi.fn());
    subscribeToTopic('/topic/b', vi.fn());

    const client = lastClient();
    client.fireConnect();

    unsubscribeA();
    client.fireWebSocketClose();
    client.fireConnect();

    const topicsAfterReconnect = client.subscribe.mock.calls.slice(2).map((call) => call[0]);
    expect(topicsAfterReconnect).toEqual(['/topic/b']);
  });

  it('reports isReconnect=false on first connect and true afterwards', async () => {
    const { subscribeToTopic, onSocketConnect } = await loadModule();
    subscribeToTopic('/topic/a', vi.fn());

    const contexts: boolean[] = [];
    onSocketConnect(({ isReconnect }) => contexts.push(isReconnect));

    const client = lastClient();
    client.fireConnect();
    client.fireWebSocketClose();
    client.fireConnect();

    expect(contexts).toEqual([false, true]);
  });

  it('removes connect listeners via the returned cleanup function', async () => {
    const { subscribeToTopic, onSocketConnect } = await loadModule();
    subscribeToTopic('/topic/a', vi.fn());

    const listener = vi.fn();
    const removeListener = onSocketConnect(listener);
    removeListener();

    lastClient().fireConnect();
    expect(listener).not.toHaveBeenCalled();
  });

  it('disconnectStompClient deactivates the client and resets state', async () => {
    const { subscribeToTopic, disconnectStompClient, onSocketConnect } = await loadModule();
    subscribeToTopic('/topic/a', vi.fn());
    const client = lastClient();
    client.fireConnect();

    await disconnectStompClient();
    expect(client.deactivate).toHaveBeenCalled();

    // A new session starts from scratch: fresh client, first connect again
    const contexts: boolean[] = [];
    onSocketConnect(({ isReconnect }) => contexts.push(isReconnect));
    subscribeToTopic('/topic/a', vi.fn());
    const newClient = lastClient();
    expect(newClient).not.toBe(client);
    newClient.fireConnect();
    expect(contexts).toEqual([false]);
  });

  it('configures worker heartbeats and SockJS transport', async () => {
    const { subscribeToTopic } = await loadModule();
    subscribeToTopic('/topic/a', vi.fn());
    const client = lastClient();
    expect(client.config.heartbeatStrategy).toBe('worker');
    expect(client.config.reconnectDelay).toBeGreaterThan(0);
    expect(typeof client.config.webSocketFactory).toBe('function');
  });
});
