import type { EventCreationData } from '../../types';
import type { SelectedCustomer, SelectedVehicle, RecurrenceRuleRequest } from '@/modules/appointments/types';

export type { EventCreationData };

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface ServiceAdjustment {
    type: AdjustmentType;
    value: number;
}

/** Pre-fill data for opening the modal from an external context (e.g. lead booking) */
export interface QuickEventInitialData {
  customer?: SelectedCustomer;
  /** Open the customer section in edit mode (Zatwierdź / Anuluj) instead of confirmed. */
  customerEditing?: boolean;
  vehicle?: SelectedVehicle;
  title?: string;
  serviceIds?: string[];
  servicePrices?: { [serviceId: string]: number };
  tempServices?: { [serviceId: string]: { name: string; basePriceNet: number; vatRate: number } };
}

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
    serviceAdjustments?: { [key: string]: ServiceAdjustment };
    serviceNotes?: { [key: string]: string };
    serviceVatRates?: { [key: string]: number };
    serviceBasePrices?: { [key: string]: number };
    tempServices?: { [key: string]: { name: string; basePriceNet: number; vatRate: number } };
    colorId: string;
    notes?: string;
    sendConfirmationSms: boolean;
    sendReminderSms: boolean;
    recurrence?: RecurrenceRuleRequest | null;
}

export interface QuickEventModalRef {
    clearForm: () => void;
}

export interface QuickEventModalProps {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => Promise<void> | void;
    initialData?: QuickEventInitialData;
}
