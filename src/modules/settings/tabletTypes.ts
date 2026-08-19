export interface Tablet {
    tabletId: string;
    deviceName: string;
    pairedAt: string;
    /** Ostatnie żądanie z urządzenia; null, gdy nie odezwało się od sparowania. */
    lastSeenAt: string | null;
}

export interface PairingCodeResponse {
    code: string;
    expiresAt: string;
}

export type TabletEventType = 'TABLET_PAIRED' | 'TABLET_REVOKED';

export interface TabletSocketEvent {
    type: TabletEventType;
    tabletId: string;
    deviceName: string;
    occurredAt: string;
}
