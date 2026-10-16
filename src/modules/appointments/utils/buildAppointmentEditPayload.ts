// src/modules/appointments/utils/buildAppointmentEditPayload.ts
//
// Pure payload builder for AppointmentEditView (editing an existing reservation).
// Extracted out of the view so the exact wire contract sent to
// PUT /v1/appointments/{id} can be unit-tested field by field, independently of
// React state and rendering. Not to be confused with buildAppointmentPayload.ts,
// which builds the (differently-shaped) creation payload for the calendar
// quick-create flow.

import type { CheckInFormData } from '@/modules/checkin/types';
import type { AppointmentAddress, AppointmentCreateRequest } from '@/modules/appointments/types';
import { isSameLocalDay, toInstant } from '@/common/dateTime';
import { toApiServiceLineItem } from '@/common/utils/priceAdjustment';
import { normalizeVehicleKind } from '@/modules/vehicles/vehicleKind';

// CheckInFormData.technicalState (edited in VerificationStep) -> the note fields
// the API actually persists. Kept as a pure function so the mapping is testable
// on its own.
export const mapTechnicalNotesToPayload = (technicalState: CheckInFormData['technicalState']) => ({
    // Legacy single-field consumers (calendar tooltips, reminders) still read `note`.
    note: technicalState.inspectionNotes || undefined,
    internalNote: technicalState.inspectionNotes || undefined,
    protocolNote: technicalState.protocolNotes || undefined,
});

// Adres idzie w czterech polach. Dawniej sklejany był w napis „ulica, kod miasto",
// który serwer wpisywał w całości do kolumny ulicy - miasto i kod zostawały stare,
// a każdy zapis edycji doklejał je do ulicy jeszcze raz. Null (brak adresu w formularzu)
// to undefined, czyli „bez zmian"; wyczyszczone pola idą jako puste i usuwają adres.
export const mapAddressToPayload = (
    address: CheckInFormData['homeAddress'] | undefined,
): AppointmentAddress | undefined =>
    address
        ? {
            street: address.street ?? '',
            city: address.city ?? '',
            postalCode: address.postalCode ?? '',
            country: address.country ?? '',
        }
        : undefined;

export const mapCompanyToPayload = (company: CheckInFormData['company'] | undefined) =>
    company
        ? {
            name: company.name,
            nip: company.nip,
            regon: company.regon,
            address: mapAddressToPayload(company.address) ?? { street: '', city: '', postalCode: '', country: '' },
        }
        : undefined;

export function buildAppointmentEditPayload(formData: CheckInFormData): AppointmentCreateRequest | null {
    let startInstant = '';
    let endInstant = '';
    try {
        startInstant = toInstant(formData.visitStartAt || '');
        endInstant = toInstant(formData.visitEndAt || '');
    } catch {
        return null;
    }

    const payload: AppointmentCreateRequest = {
        customer: formData.isNewCustomer
            ? {
                mode: 'NEW',
                newData: {
                    firstName: formData.customerData.firstName,
                    lastName: formData.customerData.lastName,
                    phone: formData.customerData.phone,
                    email: formData.customerData.email,
                    company: mapCompanyToPayload(formData.company),
                    homeAddress: mapAddressToPayload(formData.homeAddress),
                },
            }
            : formData.customerData.id
                ? {
                    mode: 'UPDATE',
                    id: formData.customerData.id,
                    updateData: {
                        firstName: formData.customerData.firstName,
                        lastName: formData.customerData.lastName,
                        phone: formData.customerData.phone,
                        email: formData.customerData.email,
                        company: mapCompanyToPayload(formData.company),
                        homeAddress: mapAddressToPayload(formData.homeAddress),
                    },
                }
                : {
                    mode: 'EXISTING',
                    id: formData.customerData.id,
                },
        vehicle: !formData.vehicleData
            ? { mode: 'NONE' }
            : formData.isNewVehicle || !formData.vehicleData.id
                ? {
                    mode: 'NEW',
                    newData: {
                        // Nowy pojazd zawsze z rodzajem - brak pola serwer czyta jako
                        // samochód, a marka motocykla nie przeszłaby jego katalogu aut.
                        kind: normalizeVehicleKind(formData.vehicleData.kind),
                        brand: formData.vehicleData.brand,
                        model: formData.vehicleData.model,
                        // Wire key is `year`, not `yearOfProduction` (which is only the
                        // internal form-state field name) - the backend's
                        // NewVehicleDataRequest DTO has no alias for the old key, and
                        // Jackson silently drops unknown properties, so sending the
                        // wrong key here means "rok produkcji" is never persisted.
                        year: formData.vehicleData.yearOfProduction,
                        licensePlate: formData.vehicleData.licensePlate || undefined,
                        color: formData.vehicleData.color,
                        // Okno edycji to formularz przyjęcia - z polem VIN i aparatem. Bez
                        // tego klucza VIN odczytany ze zdjęcia stał w polu, a po zapisie
                        // i ponownym wejściu znikał. Undefined (pole nieruszane) - bez zmian.
                        vin: formData.vehicleData.vin,
                    },
                }
                : {
                    mode: 'UPDATE',
                    id: formData.vehicleData.id,
                    // „Dopisz jako współwłaściciela" z VerificationStep - tylko gdy operator
                    // podmienił klienta, a auto zostawił. Wcześniej payload go pomijał
                    // i klient rezerwacji nie był powiązany z autem. Brak pola - właściciele
                    // bez zmian (tak samo wysyła to przyjęcie pojazdu, useCheckInWizard).
                    ownership: formData.vehicleOwnershipAction ?? undefined,
                    updateData: {
                        // Pominięty (rodzaj nieznany) - serwer zostawia ten, który pojazd ma.
                        kind: formData.vehicleData.kind,
                        brand: formData.vehicleData.brand,
                        model: formData.vehicleData.model,
                        year: formData.vehicleData.yearOfProduction,
                        licensePlate: formData.vehicleData.licensePlate || undefined,
                        color: formData.vehicleData.color,
                        // Okno edycji to formularz przyjęcia - z polem VIN i aparatem. Bez
                        // tego klucza VIN odczytany ze zdjęcia stał w polu, a po zapisie
                        // i ponownym wejściu znikał. Undefined (pole nieruszane) - bez zmian.
                        vin: formData.vehicleData.vin,
                    },
                },
        services: formData.services.map(toApiServiceLineItem),
        schedule: {
            // Ekran edycji nie ma przełącznika „całodniowa" - flaga przychodzi z oryginału.
            // Rezerwacja całodniowa przeciągnięta tu na kilka dni zostawała całodniowa
            // (24-28.09 z isAllDay), a całodniowa może być tylko wizyta jednodniowa.
            isAllDay: (formData.isAllDay ?? false) && isSameLocalDay(startInstant, endInstant),
            startDateTime: startInstant,
            endDateTime: endInstant,
        },
        appointmentTitle: formData.title || undefined,
        appointmentColorId: formData.appointmentColorId,
        ...mapTechnicalNotesToPayload(formData.technicalState),
        doorToDoor: formData.doorToDoor?.enabled
            ? {
                pickupCity: formData.doorToDoor.pickupAddress.city,
                pickupStreet: formData.doorToDoor.pickupAddress.street,
                deliveryCity: formData.doorToDoor.deliveryAddress.city,
                deliveryStreet: formData.doorToDoor.deliveryAddress.street,
                notes: formData.doorToDoor.notes || undefined,
            }
            : undefined,
    };

    if (!payload.customer || !payload.appointmentColorId || payload.services.length === 0 || !formData.visitStartAt || !formData.visitEndAt) return null;

    return payload;
}
