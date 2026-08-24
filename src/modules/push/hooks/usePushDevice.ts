import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushApi } from '../api/pushApi';
import { describeThisDevice, getPushSupportState, isIosOutsidePwa, urlBase64ToUint8Array } from '../utils/webPush';
import type { PushSupportState } from '../types';

export const pushQueryKeys = {
    devices: ['push', 'devices'] as const,
};

/**
 * Pairing the CURRENT device (the phone) as a Click-to-Call receiver.
 *
 * The whole flow rides on a user gesture: `enable()` must be called from a
 * click handler, because Notification.requestPermission() without a gesture
 * is auto-denied on both Chrome and Safari.
 *
 * Flow: permission → SW registration ready → pushManager.subscribe(VAPID key
 * from the backend) → POST the subscription to /v1/push/devices, where the
 * session cookie ties it to the logged-in user.
 */
export const usePushDevice = () => {
    const queryClient = useQueryClient();
    const [support, setSupport] = useState<PushSupportState>(() => getPushSupportState());
    const [isSubscribedHere, setIsSubscribedHere] = useState<boolean | null>(() =>
        getPushSupportState() === 'supported' ? null : false,
    );

    const devicesQuery = useQuery({
        queryKey: pushQueryKeys.devices,
        queryFn: pushApi.listDevices,
        staleTime: 30_000,
    });

    // Does THIS browser hold a live subscription? (Server list alone can't say —
    // it covers all of the user's devices.)
    useEffect(() => {
        let cancelled = false;
        if (getPushSupportState() !== 'supported') return;
        navigator.serviceWorker.ready
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

    const enableMutation = useMutation({
        mutationFn: async () => {
            const permission = await Notification.requestPermission();
            setSupport(getPushSupportState());
            if (permission !== 'granted') {
                throw new Error('permission-denied');
            }

            const registration = await navigator.serviceWorker.ready;
            const applicationServerKey = urlBase64ToUint8Array(await pushApi.getVapidPublicKey());
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    // Browsers only accept subscriptions that promise a visible
                    // notification per push — exactly what click-to-call does.
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

    const disableMutation = useMutation({
        mutationFn: async () => {
            // Local unsubscribe only. The server row self-heals: the next
            // call-request gets 410 Gone from the push service and the backend
            // revokes the row. Explicit server-side revoke stays available per
            // device via revokeDevice() in the devices list.
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
        },
        onSuccess: () => {
            setIsSubscribedHere(false);
            queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
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
        support,
        iosNeedsInstall: isIosOutsidePwa(),
        isSubscribedHere,
        devices: devicesQuery.data ?? [],
        isLoadingDevices: devicesQuery.isLoading,
        enable: enableMutation.mutateAsync,
        isEnabling: enableMutation.isPending,
        disable: disableMutation.mutateAsync,
        revokeDevice,
    };
};
