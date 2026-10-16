// src/modules/appointments/types.ts
import type { VehicleKind } from '@/modules/vehicles/vehicleKind';
export type MoneyAmount = number;

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

/**
 * Adres w czterech polach, jak w przyjęciu pojazdu. Nigdy jeden napis: serwer wpisywał
 * napis „ulica, kod miasto" w całości do kolumny ulicy, a każdy zapis edycji doklejał
 * kod i miasto jeszcze raz.
 */
export interface AppointmentAddress {
    street: string;
    city: string;
    postalCode: string;
    country: string;
}

/**
 * Co zrobić z właścicielami pojazdu, gdy klient rezerwacji nie jest jednym z nich
 * (operator podmienił klienta, a auto zostawił). Brak pola - właściciele bez zmian.
 */
export type AppointmentVehicleOwnership = 'ADD_CO_OWNER' | 'TRANSFER_PRIMARY';

export type CustomerIdentity =
    | {
        mode: 'EXISTING';
        id: string;
    }
    | {
        mode: 'NEW';
        newData: {
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            email: string | null;
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: AppointmentAddress;
            };
            /** Undefined - bez zmian, same puste pola - usunięcie adresu. */
            homeAddress?: AppointmentAddress;
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        updateData: {
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            email: string | null;
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: AppointmentAddress;
            };
            /** Undefined - bez zmian, same puste pola - usunięcie adresu. */
            homeAddress?: AppointmentAddress;
        };
    };

export type VehicleIdentity =
    | {
        mode: 'EXISTING';
        id: string;
        ownership?: AppointmentVehicleOwnership;
    }
    | {
        mode: 'NEW';
        newData: {
            kind?: VehicleKind;
            brand: string;
            model: string;
            year?: number;
            licensePlate?: string;
            color?: string;
            /** Undefined - bez zmian, pusty napis - usunięcie VIN (jak w przyjęciu pojazdu). */
            vin?: string;
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        ownership?: AppointmentVehicleOwnership;
        updateData: {
            /** Pominięty - bez zmian. */
            kind?: VehicleKind;
            brand: string;
            model: string;
            year?: number;
            licensePlate?: string;
            color?: string;
            /** Undefined - bez zmian, pusty napis - usunięcie VIN (jak w przyjęciu pojazdu). */
            vin?: string;
        };
    }
    | {
        mode: 'NONE';
    };

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: MoneyAmount;
    /**
     * Brutto bazowe DOKŁADNIE takie, jakie ustalił człowiek albo katalog usług.
     *
     * Nie jest to `basePriceNet` przeliczone stawką - przy 23% VAT nie istnieje
     * kwota netto w groszach dająca równo 1900,00 zł brutto. Gdy tu stoi, wygrywa
     * z każdym przeliczeniem; gdy nie stoi, brutto wolno policzyć z netta.
     */
    basePriceGross?: MoneyAmount;
    /** Brutto końcowe policzone przez serwer dla tego rabatu (pozycje odczytane z API). */
    finalPriceGross?: MoneyAmount | null;
    vatRate: number;
    requireManualPrice: boolean;
    adjustment: PriceAdjustment;
    note?: string;
}

export interface AppointmentCreateRequest {
    customer: CustomerIdentity;
    vehicle: VehicleIdentity;
    services: ServiceLineItem[];
    schedule: {
        isAllDay: boolean;
        /** Instant (UTC ISO-8601 with trailing 'Z') */
        startDateTime: string;
        /** Instant (UTC ISO-8601 with trailing 'Z') */
        endDateTime: string;
    };
    appointmentTitle?: string;
    note?: string;
    /** Visible only inside the CRM, never printed on the pickup protocol. */
    internalNote?: string;
    /** Printed on the vehicle pickup protocol. */
    protocolNote?: string;
    appointmentColorId: string;
    sendConfirmationSms?: boolean;
    sendReminderSms?: boolean;
    recurrence?: RecurrenceRuleRequest;
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string;
    };
}

export type SmsStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface ConfirmationSmsInfo {
    status: 'SENT' | 'FAILED';
    sentAt: string;
}

export interface ReminderSmsInfo {
    requested: boolean;
    status: SmsStatus | null;
    sentAt: string | null;
    editable: boolean;
}

export interface AppointmentSmsInfo {
    confirmationSms: ConfirmationSmsInfo | null;
    reminderSms: ReminderSmsInfo;
}

export interface Service {
    id: string;
    name: string;
    basePriceNet: MoneyAmount;
    /** Brutto z cennika - dokładne, bo wpisał je człowiek zakładając usługę. */
    basePriceGross?: MoneyAmount;
    vatRate: number;
    requireManualPrice: boolean;
    category: string;
}

export interface Customer {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
}

export interface Vehicle {
    id: string;
    kind?: VehicleKind;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
}

export interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
    /** Zaznaczany z góry na nowej wizycie; backend gwarantuje najwyżej jeden na studio. */
    isDefault?: boolean;
    isActive?: boolean;
}

export interface SelectedCustomer {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    isNew: boolean;
    hasUpdates?: boolean;
}

export interface SelectedVehicle {
    id?: string;
    /** Brak - samochód. */
    kind?: VehicleKind;
    brand: string;
    model: string;
    year?: number;
    /**
     * Tablica z kartoteki. Potrzebna przy zapisie zmian istniejącego pojazdu: serwer
     * w trybie UPDATE zapisuje tablicę taką, jaka przyszła, więc brak pola ją kasuje.
     * Undefined - nieznana (wtedy zmian pojazdu nie wysyłamy), null - auto bez tablicy.
     */
    licensePlate?: string | null;
    isNew: boolean;
    /** Operator zmienił markę/model/rok istniejącego pojazdu - zapis idzie jako UPDATE. */
    hasUpdates?: boolean;
}

// ─── Recurrence types ─────────────────────────────────────────────────────────

export type RecurrenceType = 'WEEKLY' | 'MONTHLY';
export type RecurrenceEndType = 'COUNT' | 'DATE' | 'OPEN';
export type RecurrenceEditScope = 'THIS' | 'THIS_AND_FUTURE' | 'ALL';
/**
 * Zakres, który nadpisuje INNE rezerwacje serii. Edycja zwykła nie wysyła zakresu wcale
 * (serwer przyjmuje wtedy „tylko ta") - zmiana w serii musi być wybrana wprost.
 */
export type SeriesEditScope = Exclude<RecurrenceEditScope, 'THIS'>;

/** GET /v1/appointments/{id}/series-impact - liczone bez edytowanej rezerwacji. */
export interface SeriesScopeImpact {
    otherCount: number;
    skippedDetachedCount: number;
    skippedConvertedCount: number;
}

export interface SeriesEditImpact {
    seriesId: string;
    recurrenceIndex: number;
    totalInSeries: number;
    isDetached: boolean;
    thisAndFuture: SeriesScopeImpact;
    all: SeriesScopeImpact;
}

/** Wynik zapisu w serii; `updatedCount` liczy RAZEM z edytowaną rezerwacją. */
export interface SeriesUpdateSummary {
    scope: SeriesEditScope;
    updatedCount: number;
    skippedDetachedCount: number;
    skippedConvertedCount: number;
}

export interface AppointmentUpdateResponse {
    id: string;
    customerId: string;
    vehicleId: string | null;
    totalNet: number;
    totalGross: number;
    totalVat: number;
    seriesUpdate?: SeriesUpdateSummary | null;
}

export type DayOfWeek =
    | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
    | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface RecurrenceRuleRequest {
    type: RecurrenceType;
    // WEEKLY only
    intervalWeeks?: number;
    daysOfWeek?: DayOfWeek[];
    // MONTHLY only
    dayOfMonth?: number;
    // End condition
    endType: RecurrenceEndType;
    maxOccurrences?: number;
    endDate?: string;
}

export interface RecurrenceInfo {
    seriesId: string;
    recurrenceIndex: number;
    totalInSeries: number;
    isDetached: boolean;
}

export interface CreateRecurringAppointmentResponse {
    seriesId: string;
    occurrenceCount: number;
    firstAppointmentId: string;
    customerId: string;
    vehicleId: string | null;
}

export interface RecurrenceSeriesResponse {
    id: string;
    type: RecurrenceType;
    intervalWeeks: number | null;
    daysOfWeek: DayOfWeek[] | null;
    dayOfMonth: number | null;
    endType: RecurrenceEndType;
    endDate: string | null;
    maxOccurrences: number | null;
    isOpenEnded: boolean;
    totalOccurrences: number;
    createdAt: string;
}
