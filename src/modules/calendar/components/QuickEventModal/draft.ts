// src/modules/calendar/components/QuickEventModal/draft.ts
//
// Szkic niedokończonej rezerwacji.
//
// Zamknięte okno (Escape, klik w tło, „Anuluj", „Wyczyść wszystko") zostawiało dawniej
// cały stan w formularzu, a kolejne otwarcie na INNYM terminie pokazywało nowy termin
// z klientem i usługami poprzedniej próby - łatwo było zapisać rezerwację na złego
// klienta. Teraz zamknięcie odkłada stan do szkicu, formularz startuje pusty, a pasek
// „Wróć do szkicu" przywraca wszystko poza terminem: termin to ten, który użytkownik
// właśnie wskazał w kalendarzu (decyzja biznesu z 21.10.2026: okno pamięta szkic).

import type { DoorToDoorInfo } from '@/modules/visits/types';
import type { SelectedCustomer, SelectedVehicle, RecurrenceRuleRequest } from '@/modules/appointments/types';
import type { VehicleKind } from '@/modules/vehicles/vehicleKind';
import { pluralPl } from '@/common/utils/plural';
import type { ServiceAdjustment } from './types';

export interface QuickEventDraft {
    title: string;
    notes: string;
    doorToDoor: DoorToDoorInfo;
    selectedColorId: string;
    selectedCustomer: SelectedCustomer | null;
    selectedCustomerId: string | undefined;
    customerFirstName: string;
    customerLastName: string;
    customerPhonePrefix: string;
    customerPhone: string;
    customerEmail: string;
    customerEditMode: boolean;
    selectedVehicle: SelectedVehicle | null;
    vehicleKind: VehicleKind;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: string;
    isAddingNewVehicle: boolean;
    vehicleEditMode: boolean;
    selectedServiceIds: string[];
    serviceRefs: { [lineId: string]: string };
    servicePrices: { [lineId: string]: number };
    servicePriceInputs: { [lineId: string]: { net: string; gross: string } };
    serviceAdjustments: { [lineId: string]: ServiceAdjustment };
    serviceNotes: { [lineId: string]: string };
    serviceVatRates: { [lineId: string]: number };
    serviceBasePrices: { [lineId: string]: number };
    tempServices: { [serviceId: string]: { name: string; basePriceNet: number; vatRate: number } };
    lineIdSeq: number;
    sendConfirmationSms: boolean;
    sendReminderSms: boolean;
    sendVisitCard: boolean;
    isRecurring: boolean;
    recurrenceRule: RecurrenceRuleRequest;
}

/** Czy w formularzu jest coś, czego szkoda byłoby stracić. Termin i kolor się nie liczą. */
export const hasDraftContent = (d: QuickEventDraft): boolean =>
    !!(d.title.trim() || d.notes.trim()
        || d.selectedCustomer
        || d.customerFirstName.trim() || d.customerLastName.trim() || d.customerPhone.trim() || d.customerEmail.trim()
        || d.selectedVehicle || d.vehicleBrand.trim() || d.vehicleModel.trim()
        || d.selectedServiceIds.length > 0
        || d.doorToDoor.enabled);

/** Jedno zdanie na pasek: kto, co, ile usług - bez separatorów „·" (CLAUDE.md §4). */
export const draftSummary = (d: QuickEventDraft): string => {
    const name = [d.customerFirstName, d.customerLastName].map(s => s.trim()).filter(Boolean).join(' ')
        || [d.customerPhonePrefix, d.customerPhone].map(s => s.trim()).filter(Boolean).join(' ').replace(/^\+\d+$/, '')
        || d.customerEmail.trim();
    const vehicle = [d.vehicleBrand, d.vehicleModel].map(s => s.trim()).filter(Boolean).join(' ');
    const count = d.selectedServiceIds.length;
    const parts = [
        name || d.title.trim(),
        vehicle,
        count > 0 ? `${count} ${pluralPl(count, 'usługa', 'usługi', 'usług')}` : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'bez klienta i usług';
};
