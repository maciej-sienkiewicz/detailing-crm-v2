export interface StudioProfile {
    userId: string;
    firstName: string;
    lastName: string;
    isOwner: boolean;
    /** Nazwa przypisanej roli („Recepcja"); null = właściciel albo konto bez roli. */
    roleName?: string | null;
    hasPinConfigured: boolean;
    pinLocked: boolean;
}

export interface PinStatusResponse {
    hasPinConfigured: boolean;
    pinLocked: boolean;
}

export interface SwitchUserRequest {
    userId: string;
    pin: string;
}

export interface SetPinRequest {
    currentPassword: string;
    pin: string;
}

/** Stored in localStorage: lightweight profile stub for the switcher UI. */
export interface KnownProfile {
    userId: string;
    studioId: string;
    firstName: string;
    lastName: string;
    role: string;
}
