import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushApi } from '../api/pushApi';
import {
    describeThisDevice, getPushSupportState, urlBase64ToUint8Array, waitForServiceWorker,
} from '../utils/webPush';
import { detectPushPlatform, readPlatformEnv } from '../utils/pushPlatform';
import { getServiceWorkerVersion } from '../utils/serviceWorkerRegistration';
import type { PushSupportState } from '../types';

export const pushQueryKeys = {
    devices: ['push', 'devices'] as const,
    swVersion: ['push', 'sw-version'] as const,
};

interface Options {
    /**
     * Lista urządzeń konta z serwera. Wyłączona tam, gdzie liczy się tylko stan
     * TEGO urządzenia (zachęta w układzie aplikacji) - bez zapytania przy każdym widoku.
     */
    withDevices?: boolean;
}

/**
 * Pairing the CURRENT device (the phone) as a receiver of the studio's push
 * notifications - click-to-call requests, closed visits, new leads.
 *
 * The whole flow rides on a user gesture: `enable()` must be called from a
 * click handler, because Notification.requestPermission() without a gesture
 * is auto-denied on both Chrome and Safari. `enable()` therefore asks for the
 * permission SYNCHRONOUSLY, before anything is awaited: a mutation runs its
 * function only after a few internal awaits, and Safari on iOS does not always
 * carry the tap's activation across them - the prompt then never appeared and
 * the user saw "zablokowane" without having been asked.
 *
 * Flow: permission → SW registration ready → pushManager.subscribe(VAPID key
 * from the backend) → POST the subscription to /v1/push/devices, where the
 * session cookie ties it to the logged-in user.
 */
export const usePushDevice = ({ withDevices = true }: Options = {}) => {
    const queryClient = useQueryClient();
    const platform = useMemo(() => detectPushPlatform(readPlatformEnv()), []);
    const [support, setSupport] = useState<PushSupportState>(() => getPushSupportState());
    const [isSubscribedHere, setIsSubscribedHere] = useState<boolean | null>(() =>
        getPushSupportState() === 'supported' ? null : false,
    );

    const devicesQuery = useQuery({
        queryKey: pushQueryKeys.devices,
        queryFn: pushApi.listDevices,
        staleTime: 30_000,
        // iPhone w Safari potrzebuje listy zawsze - tylko z niej wiadomo, czy CRM
        // nie stoi już na ekranie początkowym (appLikelyOnHomeScreen).
        enabled: withDevices || platform.kind === 'ios-install',
    });

    // Safari nie widzi aplikacji z ekranu początkowego - osobne ciasteczka, osobna
    // pamięć, żadnego API do wykrycia ani otwarcia. Aktywne urządzenie iOS na tym
    // koncie to najlepsza dostępna podpowiedź, że ikona już jest: bez niej kreator
    // kazał ponownie „dodać do ekranu" komuś, kto zrobił to tydzień temu. Tylko
    // podpowiedź (iOS ma zamrożony User-Agent, dwa iPhone'y wyglądają tak samo),
    // dlatego kreator zawsze zostawia drogę do instrukcji instalacji.
    const appLikelyOnHomeScreen = platform.kind === 'ios-install' &&
        (devicesQuery.data ?? []).some(device => device.active && device.platform === 'IOS');

    // Which worker version serves this page - the answer to "has this phone got the fix yet?".
    const swVersionQuery = useQuery({
        queryKey: pushQueryKeys.swVersion,
        queryFn: () => getServiceWorkerVersion(),
        staleTime: 5 * 60_000,
        enabled: withDevices && support !== 'unsupported',
    });

    // Does THIS browser hold a live subscription? (Server list alone can't say -
    // it covers all of the user's devices.)
    const refreshSubscription = useCallback(() => {
        if (getPushSupportState() !== 'supported') return () => {};
        let cancelled = false;
        // Z limitem czasu: bez zarejestrowanego workera `ready` nigdy nie odpowiada,
        // a stan „sprawdzam" zostawał na ekranie na zawsze.
        waitForServiceWorker()
            .then(registration => registration.pushManager.getSubscription())
            .then(subscription => {
                if (!cancelled) setIsSubscribedHere(Boolean(subscription));
            })
            .catch(() => {
                if (!cancelled) setIsSubscribedHere(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => refreshSubscription(), [refreshSubscription]);

    // Odblokowanie powiadomień dzieje się POZA aplikacją - w ustawieniach systemu albo
    // przeglądarki. Po powrocie ekran ma sam zauważyć zmianę, a nie trzymać komunikatu
    // „zablokowane" do przeładowania, którego użytkownik PWA nie ma jak zrobić.
    useEffect(() => {
        const recheck = () => {
            if (document.visibilityState !== 'visible') return;
            const next = getPushSupportState();
            setSupport(next);
            // Tanie (lokalne getSubscription), a łapie też subskrypcję zdjętą w ustawieniach.
            if (next === 'supported') refreshSubscription();
        };
        document.addEventListener('visibilitychange', recheck);

        let status: PermissionStatus | null = null;
        let disposed = false;
        navigator.permissions?.query({ name: 'notifications' as PermissionName })
            .then(result => {
                if (disposed) return;
                status = result;
                status.onchange = recheck;
            })
            .catch(() => {/* Safari bez Permissions API dla powiadomień - zostaje visibilitychange */});

        return () => {
            disposed = true;
            document.removeEventListener('visibilitychange', recheck);
            if (status) status.onchange = null;
        };
    }, [refreshSubscription]);

    const enableMutation = useMutation({
        mutationFn: async (permissionRequest: Promise<NotificationPermission>) => {
            const permission = await permissionRequest;
            setSupport(getPushSupportState());
            if (permission !== 'granted') {
                throw new Error('permission-denied');
            }

            const registration = await waitForServiceWorker();
            const applicationServerKey = urlBase64ToUint8Array(await pushApi.getVapidPublicKey());
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    // Browsers only accept subscriptions that promise a visible
                    // notification per push - exactly what click-to-call does.
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey as BufferSource,
                }));

            const json = subscription.toJSON();
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error('subscription-incomplete');
            }

            return pushApi.registerDevice({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                deviceName: describeThisDevice(),
                userAgent: navigator.userAgent,
            });
        },
        onSuccess: () => {
            setIsSubscribedHere(true);
            queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
        },
    });

    /** Wołać WYŁĄCZNIE z obsługi kliknięcia - patrz komentarz nad hookiem. */
    const enable = useCallback(() => {
        const permissionRequest = 'Notification' in window
            ? Notification.requestPermission()
            : Promise.resolve<NotificationPermission>('denied');
        return enableMutation.mutateAsync(permissionRequest);
    }, [enableMutation]);

    const disableMutation = useMutation({
        mutationFn: async () => {
            // Local unsubscribe only. The server row self-heals: the next
            // call-request gets 410 Gone from the push service and the backend
            // revokes the row. Explicit server-side revoke stays available per
            // device via revokeDevice() in the devices list.
            const registration = await waitForServiceWorker();
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
        },
        onSuccess: () => {
            setIsSubscribedHere(false);
            queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
        },
    });

    const testMutation = useMutation({
        mutationFn: async () => {
            const registration = await waitForServiceWorker();
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) throw new Error('not-subscribed');
            await pushApi.sendTestPush(subscription.endpoint);
        },
    });

    const revokeDevice = useCallback(
        async (deviceId: string) => {
            await pushApi.revokeDevice(deviceId);
            queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
        },
        [queryClient],
    );

    return {
        platform,
        support,
        isSubscribedHere,
        appLikelyOnHomeScreen,
        devices: devicesQuery.data ?? [],
        isLoadingDevices: devicesQuery.isLoading,
        serviceWorkerVersion: swVersionQuery.data ?? null,
        enable,
        isEnabling: enableMutation.isPending,
        disable: disableMutation.mutateAsync,
        isDisabling: disableMutation.isPending,
        sendTest: testMutation.mutateAsync,
        isSendingTest: testMutation.isPending,
        revokeDevice,
    };
};

export type PushDeviceState = ReturnType<typeof usePushDevice>;
