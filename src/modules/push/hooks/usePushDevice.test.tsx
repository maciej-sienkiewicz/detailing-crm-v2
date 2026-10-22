// @vitest-environment jsdom
//
// „To urządzenie odbiera powiadomienia" musi zgadzać się z serwerem, nie tylko z przeglądarką.
//
// Zgłoszenie: ekran pokazywał „odbiera powiadomienia z CRM", a próbne kończyło się
// „To urządzenie nie jest sparowane". Przeglądarka trzymała subskrypcję, której serwer
// już nie uznawał (odłączona na liście, wygasła po 410, przejęta przez inne konto
// zalogowane w tej samej przeglądarce) - a hook ufał samej przeglądarce.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pushApi } from '../api/pushApi';
import { usePushDevice } from './usePushDevice';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

const subscription = {
    endpoint: ENDPOINT,
    unsubscribe: vi.fn(async () => true),
};
const registration = {
    pushManager: { getSubscription: vi.fn(async () => subscription as unknown as PushSubscription | null) },
};

vi.mock('../utils/webPush', () => ({
    getPushSupportState: () => 'supported',
    waitForServiceWorker: async () => registration,
    urlBase64ToUint8Array: () => new Uint8Array(),
    describeThisDevice: () => 'Mac, Chrome',
}));
vi.mock('../utils/serviceWorkerRegistration', () => ({ getServiceWorkerVersion: async () => null }));
vi.mock('../api/pushApi', () => ({
    pushApi: {
        listDevices: vi.fn(async () => []),
        getCurrentDevice: vi.fn(),
        getVapidPublicKey: vi.fn(),
        registerDevice: vi.fn(),
        sendTestPush: vi.fn(),
        revokeDevice: vi.fn(async () => undefined),
    },
}));

const api = vi.mocked(pushApi);

function renderPush() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(() => usePushDevice({ withDevices: false }), { wrapper });
}

beforeEach(() => {
    registration.pushManager.getSubscription.mockResolvedValue(subscription as unknown as PushSubscription);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('usePushDevice - stan „to urządzenie"', () => {
    it('subskrypcja uznana przez serwer: odbiera, a wiersz urządzenia jest znany', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: true, deviceId: 'dev-1' });
        const { result } = renderPush();

        await waitFor(() => expect(result.current.isSubscribedHere).toBe(true));
        expect(result.current.needsRepair).toBe(false);
        expect(result.current.currentDeviceId).toBe('dev-1');
        expect(api.getCurrentDevice).toHaveBeenCalledWith(ENDPOINT);
    });

    it('subskrypcja, której serwer nie uznaje: nie odbiera i trzeba włączyć ponownie', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: false, deviceId: null });
        const { result } = renderPush();

        await waitFor(() => expect(result.current.needsRepair).toBe(true));
        expect(result.current.isSubscribedHere).toBe(false);
    });

    it('póki serwer nie odpowiedział, ekran sprawdza zamiast od razu mówić „odbiera"', async () => {
        api.getCurrentDevice.mockReturnValue(new Promise(() => {}));
        const { result } = renderPush();

        await waitFor(() => expect(api.getCurrentDevice).toHaveBeenCalled());
        expect(result.current.isSubscribedHere).toBeNull();
    });

    it('backend bez tego pytania: zostaje stan przeglądarki, jak dawniej', async () => {
        api.getCurrentDevice.mockResolvedValue(null);
        const { result } = renderPush();

        await waitFor(() => expect(result.current.isSubscribedHere).toBe(true));
        expect(result.current.needsRepair).toBe(false);
    });

    it('próbne odrzucone jako „nie jest sparowane" od razu zmienia stan na „włącz ponownie"', async () => {
        api.getCurrentDevice.mockResolvedValue(null);
        api.sendTestPush.mockRejectedValue({ response: { status: 404 } });
        const { result } = renderPush();
        await waitFor(() => expect(result.current.isSubscribedHere).toBe(true));

        await act(async () => {
            await expect(result.current.sendTest()).rejects.toBeTruthy();
        });

        await waitFor(() => expect(result.current.needsRepair).toBe(true));
        expect(result.current.isSubscribedHere).toBe(false);
    });

    it('wyłączenie odłącza urządzenie także na serwerze, żeby lista nie pokazywała go jako aktywnego', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: true, deviceId: 'dev-1' });
        const { result } = renderPush();
        await waitFor(() => expect(result.current.currentDeviceId).toBe('dev-1'));

        await act(async () => {
            await result.current.disable();
        });

        expect(api.revokeDevice).toHaveBeenCalledWith('dev-1');
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(result.current.isSubscribedHere).toBe(false);
    });
});
