import type { EventCreationData } from '../../types';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';

export type { EventCreationData };

export interface Service {
    id: string;
    name: string;
    basePriceNet: number;
    vatRate: number;
    requireManualPrice: boolean;
}

export interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
}

export interface QuickEventFormData {
    title: string;
    customer: SelectedCustomer | null;
    vehicle: SelectedVehicle | null;
    startDateTime: string;
    endDateTime: string;
    isAllDay: boolean;
    serviceIds: string[];
    servicePrices?: { [key: string]: number };
    serviceNotes?: { [key: string]: string };
    tempServices?: { [key: string]: { name: string; basePriceNet: number; vatRate: number } };
    colorId: string;
    notes?: string;
}

export interface QuickEventModalRef {
    clearForm: () => void;
}

export interface QuickEventModalProps {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => Promise<void> | void;
}
