export interface PushDeviceDto {
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
    active: boolean;
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
