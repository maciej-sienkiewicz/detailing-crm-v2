// @vitest-environment jsdom
//
// „To urządzenie odbiera powiadomienia" musi zgadzać się z serwerem, nie tylko z przeglądarką.
//
// Zgłoszenia: ekran pokazywał „odbiera powiadomienia z CRM", a próbne kończyło się
// „To urządzenie nie jest sparowane" - a po odświeżeniu strony znów „odbiera". Przeglądarka
// trzymała subskrypcję, której serwer już nie uznawał (odłączona na liście, wygasła po 410,
// przejęta przez inne konto w tej samej przeglądarce). Teraz pierwsza odmowa serwera
// zdejmuje subskrypcję także w przeglądarce: urządzenie jest niesparowane na stałe.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pushApi } from '../api/pushApi';
import { usePushDevice } from './usePushDevice';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

// Przeglądarka jak prawdziwa: po unsubscribe() getSubscription() zwraca null także po odświeżeniu.
let browserHasSubscription = true;
const subscription = {
    endpoint: ENDPOINT,
    unsubscribe: vi.fn(async () => {
        browserHasSubscription = false;
        return true;
    }),
};
const registration = {
    pushManager: { getSubscription: vi.fn(async () => (browserHasSubscription ? subscription : null)) },
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

/** Każde wywołanie to „otwarcie strony" od nowa - świeża pamięć zapytań, ta sama przeglądarka. */
function openPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(() => usePushDevice({ withDevices: false }), { wrapper });
}

beforeEach(() => {
    browserHasSubscription = true;
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('usePushDevice - stan „to urządzenie"', () => {
    it('subskrypcja uznana przez serwer: odbiera, a wiersz urządzenia jest znany', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: true, deviceId: 'dev-1' });
        const { result } = openPage();

        await waitFor(() => expect(result.current.isSubscribedHere).toBe(true));
        expect(result.current.currentDeviceId).toBe('dev-1');
        expect(result.current.unpairedByServer).toBe(false);
        expect(api.getCurrentDevice).toHaveBeenCalledWith(ENDPOINT);
    });

    it('serwer nie uznaje subskrypcji: urządzenie rozparowuje się od razu, także w przeglądarce', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: false, deviceId: null });
        const { result } = openPage();

        await waitFor(() => expect(result.current.unpairedByServer).toBe(true));
        expect(result.current.isSubscribedHere).toBe(false);
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('póki serwer nie odpowiedział, ekran sprawdza zamiast od razu mówić „odbiera"', async () => {
        api.getCurrentDevice.mockReturnValue(new Promise(() => {}));
        const { result } = openPage();

        await waitFor(() => expect(api.getCurrentDevice).toHaveBeenCalled());
        expect(result.current.isSubscribedHere).toBeNull();
    });

    it('próbne odrzucone jako „nie jest sparowane" rozparowuje na stałe - po odświeżeniu też', async () => {
        // Backend bez pytania o stan (jak dev przed wdrożeniem /devices/current): tylko próbne mówi prawdę.
        api.getCurrentDevice.mockResolvedValue(null);
        api.sendTestPush.mockRejectedValue({ response: { status: 404 } });
        const first = openPage();
        await waitFor(() => expect(first.result.current.isSubscribedHere).toBe(true));

        await act(async () => {
            await expect(first.result.current.sendTest()).rejects.toBeTruthy();
        });

        await waitFor(() => expect(first.result.current.isSubscribedHere).toBe(false));
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        first.unmount();

        // Odświeżenie strony: nie wraca „odbiera powiadomienia".
        const second = openPage();
        await waitFor(() => expect(second.result.current.isSubscribedHere).toBe(false));
    });

    it('wyłączenie odłącza urządzenie także na serwerze, żeby lista nie pokazywała go jako aktywnego', async () => {
        api.getCurrentDevice.mockResolvedValue({ paired: true, deviceId: 'dev-1' });
        const { result } = openPage();
        await waitFor(() => expect(result.current.currentDeviceId).toBe('dev-1'));

        await act(async () => {
            await result.current.disable();
        });

        expect(api.revokeDevice).toHaveBeenCalledWith('dev-1');
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(result.current.isSubscribedHere).toBe(false);
    });
});
