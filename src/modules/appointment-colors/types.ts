// src/modules/appointment-colors/types.ts

export interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
    isActive: boolean;
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

export interface AppointmentColorListResponse {
    colors: AppointmentColor[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

export interface AppointmentColorFilters {
    search?: string;
    page?: number;
    limit?: number;
    showInactive?: boolean;
}
