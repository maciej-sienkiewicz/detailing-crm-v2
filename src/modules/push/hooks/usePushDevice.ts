import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { problemStatus } from '@/core/problem';
import { pushApi } from '../api/pushApi';
import {
    describeThisDevice, getPushSupportState, urlBase64ToUint8Array, waitForServiceWorker,
} from '../utils/webPush';
import { detectPushPlatform, readPlatformEnv } from '../utils/pushPlatform';
import { getServiceWorkerVersion } from '../utils/serviceWorkerRegistration';
import type { CurrentPushDevice, PushSupportState } from '../types';

export const pushQueryKeys = {
    devices: ['push', 'devices'] as const,
    /** Pod `devices`, żeby parowanie i odłączanie odświeżały też ustawienia powiadomień. */
    notificationSettings: ['push', 'devices', 'notification-settings'] as const,
    /** Pod `devices` z tego samego powodu: odłączenie na liście ma zmienić stan „to urządzenie". */
    current: (endpoint: string) => ['push', 'devices', 'current', endpoint] as const,
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
 *
 * "Receives notifications" needs BOTH sides: the browser holds a subscription
 * AND the server still counts it as this user's active device. The browser alone
 * cannot tell - the subscription outlives a revoke on the device list, a 410 from
 * the push service, and another account switching notifications on in the same
 * browser (one subscription per browser profile, ownership follows the last
 * login). Trusting the browser alone, the screen said "odbiera powiadomienia"
 * while the test push came back "nie jest sparowane".
 */
export const usePushDevice = ({ withDevices = true }: Options = {}) => {
    const queryClient = useQueryClient();
    const platform = useMemo(() => detectPushPlatform(readPlatformEnv()), []);
    const [support, setSupport] = useState<PushSupportState>(() => getPushSupportState());
    // Subskrypcja tej przeglądarki: undefined = jeszcze sprawdzam, null = brak.
    const [localEndpoint, setLocalEndpoint] = useState<string | null | undefined>(() =>
        getPushSupportState() === 'supported' ? undefined : null,
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
                if (!cancelled) setLocalEndpoint(subscription?.endpoint ?? null);
            })
            .catch(() => {
                if (!cancelled) setLocalEndpoint(null);
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

    // Druga połowa „odbiera": czy serwer wciąż uznaje tę subskrypcję za urządzenie tej osoby.
    const currentQuery = useQuery({
        queryKey: pushQueryKeys.current(localEndpoint ?? ''),
        queryFn: () => pushApi.getCurrentDevice(localEndpoint as string),
        enabled: support === 'supported' && Boolean(localEndpoint),
        staleTime: 60_000,
        retry: 1,
    });
    const serverSays: CurrentPushDevice | null | undefined = currentQuery.data;

    /**
     * true - odbiera; false - nie; null - jeszcze sprawdzam. Bez odpowiedzi serwera
     * (backend sprzed tego pytania albo błąd sieci) zostaje stan przeglądarki, jak dawniej:
     * lepiej wtedy pokazać „odbiera" niż kazać włączać coś, co może działać.
     */
    const isSubscribedHere: boolean | null =
        localEndpoint === undefined ? null
            : localEndpoint === null ? false
                : serverSays === undefined && currentQuery.isPending ? null
                    : serverSays?.paired !== false;
    /** Przeglądarka ma subskrypcję, a serwer jej nie uznaje - jedno „Włącz ponownie" to naprawia. */
    const needsRepair = Boolean(localEndpoint) && serverSays?.paired === false;
    const currentDeviceId = serverSays?.paired ? serverSays.deviceId : null;

    const enableMutation = useMutation({
        mutationFn: async (permissionRequest: Promise<NotificationPermission>) => {
            const permission = await permissionRequest;
            setSupport(getPushSupportState());
            if (permission !== 'granted') {
                throw new Error('permission-denied');
            }

            const registration = await waitForServiceWorker();
            const applicationServerKey = urlBase64ToUint8Array(await pushApi.getVapidPublicKey());
            // Istniejąca subskrypcja idzie na serwer jeszcze raz: tak „Włącz ponownie"
            // przywraca urządzenie odłączone na liście i przejmuje je od innego konta.
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

            const device = await pushApi.registerDevice({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                deviceName: describeThisDevice(),
                userAgent: navigator.userAgent,
            });
            return { endpoint: json.endpoint, device };
        },
        onSuccess: ({ endpoint, device }) => {
            queryClient.setQueryData<CurrentPushDevice>(pushQueryKeys.current(endpoint), { paired: true, deviceId: device.id });
            setLocalEndpoint(endpoint);
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
            // Najpierw serwer: lista urządzeń ma od razu przestać pokazywać to urządzenie
            // jako aktywne. Dawniej znikało z niej dopiero po pierwszym 410 od usługi push,
            // a do tego czasu lista i „To urządzenie" mówiły co innego. Błąd serwera nie
            // blokuje wyłączenia tutaj - wiersz i tak wygaśnie przy najbliższym powiadomieniu.
            if (currentDeviceId) {
                await pushApi.revokeDevice(currentDeviceId).catch(() => undefined);
            }
            const registration = await waitForServiceWorker();
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
        },
        onSuccess: () => {
            setLocalEndpoint(null);
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
        // „Nie jest sparowane" z serwera to ten sam fakt co odpowiedź na pytanie o urządzenie -
        // ekran ma od razu pokazać „Włącz ponownie", a nie dalej twierdzić, że odbiera.
        onError: error => {
            if (problemStatus(error) === 404 && localEndpoint) {
                queryClient.setQueryData<CurrentPushDevice>(pushQueryKeys.current(localEndpoint), { paired: false, deviceId: null });
            }
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
        needsRepair,
        /** Wiersz tego urządzenia na liście urządzeń (null, póki nie wiadomo albo nie jest sparowane). */
        currentDeviceId,
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
