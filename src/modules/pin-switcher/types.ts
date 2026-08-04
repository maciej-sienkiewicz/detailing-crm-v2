export interface StudioProfile {
    userId: string;
    firstName: string;
    lastName: string;
    isOwner: boolean;
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

/** Stored in localStorage — lightweight profile stub for the switcher UI. */
export interface KnownProfile {
    userId: string;
    studioId: string;
    firstName: string;
    lastName: string;
    role: string;
}
