import type { EventCreationData } from '../../types';
import type { SelectedCustomer, SelectedVehicle, RecurrenceRuleRequest } from '@/modules/appointments/types';
import type { DoorToDoorInfo } from '@/modules/visits/types';

export type { EventCreationData };

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface ServiceAdjustment {
    type: AdjustmentType;
    value: number;
}

/**
 * Pre-fill data for opening the modal from an external context (e.g. lead booking).
 *
 * Klucze map usługowych to identyfikatory POZYCJI (`serviceIds`), nie usług z katalogu —
 * ta sama usługa może wystąpić w wycenie dwa razy, każda ze swoją ceną i notatką.
 * `serviceRefs` odsyła pozycję do jej usługi w katalogu (albo do wpisu w `tempServices`).
 */
export interface QuickEventInitialData {
  customer?: SelectedCustomer;
  /** Open the customer section in edit mode (Zatwierdź / Anuluj) instead of confirmed. */
  customerEditing?: boolean;
  vehicle?: SelectedVehicle;
  title?: string;
  /** Identyfikatory pozycji wyceny — kolejność decyduje o kolejności wierszy. */
  serviceIds?: string[];
  /** lineId → id usługi w katalogu lub w [tempServices]. */
  serviceRefs?: { [lineId: string]: string };
  /** lineId → cena brutto pozycji w ZŁOTYCH (tak trzyma ją formularz). */
  servicePrices?: { [lineId: string]: number };
  /** lineId → cena bazowa netto w GROSZACH (to ona jedzie do API). */
  serviceBasePrices?: { [lineId: string]: number };
  /** lineId → stawka VAT w procentach; -1 to „zwolniony". */
  serviceVatRates?: { [lineId: string]: number };
  serviceNotes?: { [lineId: string]: string };
  tempServices?: { [serviceId: string]: { name: string; basePriceNet: number; vatRate: number } };
}

export interface ServicePackageItem {
    serviceId: string;
    serviceName: string;
    position: number;
}

export interface Service {
    id: string;
    name: string;
    basePriceNet: number;
    vatRate: number;
    requireManualPrice: boolean;
    isPackage?: boolean;
    packageItems?: ServicePackageItem[] | null;
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
    /**
     * Line-item instance ids, NOT necessarily catalog service ids. Adding the same
     * service twice creates two distinct entries here so each can carry its own
     * price/adjustment/notes. Resolve the underlying catalog (or temp) service id
     * via `serviceRefs`.
     */
    serviceIds: string[];
    /** Maps a line-item instance id (see `serviceIds`) back to its catalog/temp service id. */
    serviceRefs?: { [lineId: string]: string };
    servicePrices?: { [key: string]: number };
    serviceAdjustments?: { [key: string]: ServiceAdjustment };
    serviceNotes?: { [key: string]: string };
    serviceVatRates?: { [key: string]: number };
    serviceBasePrices?: { [key: string]: number };
    tempServices?: { [key: string]: { name: string; basePriceNet: number; vatRate: number } };
    colorId: string;
    notes?: string;
    doorToDoor?: DoorToDoorInfo;
    sendConfirmationSms: boolean;
    sendReminderSms: boolean;
    /** "Czy wysłać Kartę Wizyty do klienta?": send the card link right after booking. */
    sendVisitCard: boolean;
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
