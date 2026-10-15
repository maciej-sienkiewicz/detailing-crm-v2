import { PushNotifications } from '@capacitor/push-notifications';
import { nativePlatform } from '@/core/native/platform';
import { pushApi } from '../api/pushApi';
import type { NativePushTransport } from '../types';

/**
 * Powiadomienia w aplikacji ze sklepu.
 *
 * W widoku aplikacji nie ma Web Push (WKWebView go nie ma wcale), więc telefon dostaje
 * token od Apple albo Google i oddaje go serwerowi - ten sam, który pisze do przeglądarek
 * (backend: PushDelivery). Zgoda systemowa jest jedna na aplikację, a token potrafi się
 * zmienić (reinstalacja, przywrócenie z kopii), dlatego przy każdym starcie z zgodą
 * rejestrujemy się od nowa - serwer traktuje to jak odświeżenie, nie nowe urządzenie.
 */

export type NativePushPermission = 'granted' | 'denied' | 'prompt';

const TOKEN_KEY = 'native-push-token';

const transport = (): NativePushTransport => (nativePlatform() === 'ios' ? 'APNS' : 'FCM');

const storedToken = (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

const storeToken = (token: string | null) => {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch { /* bez pamięci wylogowanie nie odepnie telefonu - zrobi to pierwszy nieudany push */ }
};

export async function nativePushPermission(): Promise<NativePushPermission> {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'granted') return 'granted';
    return receive === 'denied' ? 'denied' : 'prompt';
}

let pending: { resolve: () => void; reject: (error: unknown) => void } | null = null;
let listening = false;
let openUrl: (url: string) => void = () => {};

function listen(): void {
    if (listening) return;
    listening = true;

    void PushNotifications.addListener('registration', ({ value }) => {
        pushApi.registerNativeDevice({ transport: transport(), token: value, deviceName: '' })
            .then(() => {
                storeToken(value);
                pending?.resolve();
            })
            .catch(error => pending?.reject(error))
            .finally(() => { pending = null; });
    });

    void PushNotifications.addListener('registrationError', ({ error }) => {
        pending?.reject(new Error(error));
        pending = null;
    });

    // Stuknięcie w powiadomienie: serwer kładzie ścieżkę ekranu w `url` (APNs: obok `aps`,
    // FCM: w `data`). Tylko ścieżki wewnątrz aplikacji - nic z zewnątrz.
    void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const url = (notification.data as { url?: unknown } | undefined)?.url;
        if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) openUrl(url);
    });
}

/** Rejestracja u Apple/Google i zapis tokenu na serwerze; kończy się, gdy serwer go ma. */
function register(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        pending = { resolve, reject };
        PushNotifications.register().catch(error => {
            pending = null;
            reject(error);
        });
    });
}

/**
 * Po zalogowaniu (także po przełączeniu osoby PIN-em): nasłuch stuknięć i odświeżenie
 * tokenu, jeśli zgoda już jest. Bez zgody nic nie pyta - o zgodę pyta dopiero przycisk.
 */
export async function startNativePush(onOpen: (url: string) => void): Promise<void> {
    openUrl = onOpen;
    listen();
    if ((await nativePushPermission()) === 'granted') await register();
}

/** Systemowe pytanie o zgodę, a po zgodzie - rejestracja. false = użytkownik odmówił. */
export async function enableNativePush(): Promise<boolean> {
    listen();
    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== 'granted') return false;
    await register();
    return true;
}

export async function sendNativeTestPush(): Promise<void> {
    const token = storedToken();
    if (!token) throw new Error('Ten telefon nie ma jeszcze włączonych powiadomień');
    await pushApi.sendNativeTestPush({ transport: transport(), token });
}

/**
 * Wylogowanie: ten telefon przestaje dostawać powiadomienia tej osoby. Błąd nie może
 * zatrzymać wylogowania - najwyżej telefon dostanie jeszcze jedno powiadomienie,
 * a następne zalogowanie przepisze token na nową osobę.
 */
export async function detachNativePush(): Promise<void> {
    const token = storedToken();
    if (!token) return;
    storeToken(null);
    try {
        await pushApi.unregisterNativeDevice({ transport: transport(), token });
    } catch { /* patrz wyżej */ }
}
