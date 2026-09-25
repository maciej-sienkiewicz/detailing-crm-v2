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
