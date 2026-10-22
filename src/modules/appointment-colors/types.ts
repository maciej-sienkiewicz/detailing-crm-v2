// src/modules/appointment-colors/types.ts

export interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
    isActive: boolean;
    /** Zaznaczany z góry na nowej wizycie. Dokładnie jeden na studio. */
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    createdByFirstName: string;
    createdByLastName: string;
    updatedByFirstName: string;
    updatedByLastName: string;
}

export interface AppointmentColorCreateRequest {
    name: string;
    hexColor: string;
}

export interface AppointmentColorUpdateRequest {
    name: string;
    hexColor: string;
}

export interface AppointmentColorFilters {
    search?: string;
    page?: number;
    pageSize?: number;
    showInactive?: boolean;
}
