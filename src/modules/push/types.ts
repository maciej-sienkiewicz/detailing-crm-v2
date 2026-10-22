export interface PushDeviceDto {
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
    active: boolean;
    /**
     * Z User-Agenta, z którym urządzenie się sparowało. Opcjonalne, bo starszy
     * backend go nie wysyła - wtedy po prostu nie ma podpowiedzi.
     */
    platform?: 'IOS' | 'ANDROID' | 'DESKTOP' | 'UNKNOWN';
}

/**
 * Rodzaj powiadomienia, który włącza się i wyłącza osobno na każdym urządzeniu
 * (backend: PushNotificationCategory). Nieznany klucz z nowszego backendu też
 * przejdzie - ekran pokaże go z nazwą techniczną zamiast zgubić.
 */
export type PushNotificationCategory =
    | 'NEW_LEADS'
    | 'LEADS_WAITING'
    | 'RESERVATIONS'
    | 'CHECKINS'
    | 'EARNINGS'
    | 'REPORTS'
    | 'COMPETITION'
    | 'LEAVE_REQUESTS'
    | 'WORKTIME_CARDS'
    | 'MY_MATTERS'
    | 'CLICK_TO_CALL'
    | (string & {});

export interface PushCategorySetting {
    category: PushNotificationCategory;
    enabled: boolean;
    /** false = posiadacz urządzenia nie ma uprawnienia, więc i tak tego nie dostanie. */
    available: boolean;
}

export interface PushDeviceNotifications {
    id: string;
    deviceName: string;
    platform: 'IOS' | 'ANDROID' | 'DESKTOP' | 'UNKNOWN';
    transport: 'WEB_PUSH' | 'APNS' | 'FCM';
    createdAt: string;
    lastUsedAt: string | null;
    userId: string;
    userName: string;
    /** Urządzenie osoby, która ogląda ekran. */
    mine: boolean;
    categories: PushCategorySetting[];
}

export interface PushNotificationSettings {
    /** true = właściciel: urządzenia całego studia. Inaczej tylko własne. */
    manageAll: boolean;
    devices: PushDeviceNotifications[];
}

/**
 * Czy serwer zna subskrypcję TEJ przeglądarki jako aktywne urządzenie zalogowanej osoby.
 * `paired: false` także wtedy, gdy urządzenie odłączono albo należy do innego konta.
 */
export interface CurrentPushDevice {
    paired: boolean;
    deviceId: string | null;
}

/** Kanał powiadomień aplikacji ze sklepu: Apple (iPhone) albo Firebase (Android). */
export type NativePushTransport = 'APNS' | 'FCM';

export interface RequestCallResponse {
    requestedDevices: number;
    deliveredDevices: number;
}

export type PushSupportState =
    | 'supported'
    /** Browser lacks SW/Push/Notification APIs (or iOS Safari outside an installed PWA). */
    | 'unsupported'
    /** User has permanently denied notification permission for this origin. */
    | 'denied';
