// src/modules/appointments/utils/buildAppointmentEditPayload.ts
//
// Pure payload builder for AppointmentEditView (editing an existing reservation).
// Extracted out of the view so the exact wire contract sent to
// PUT /v1/appointments/{id} can be unit-tested field by field, independently of
// React state and rendering. Not to be confused with buildAppointmentPayload.ts,
// which builds the (differently-shaped) creation payload for the calendar
// quick-create flow.

import type { CheckInFormData } from '@/modules/checkin/types';
import type { AppointmentCreateRequest } from '@/modules/appointments/types';
import { toInstant } from '@/common/dateTime';
import { toApiServiceLineItem } from '@/common/utils/priceAdjustment';

// CheckInFormData.technicalState (edited in VerificationStep) -> the note fields
// the API actually persists. Kept as a pure function so the mapping is testable
// on its own.
export const mapTechnicalNotesToPayload = (technicalState: CheckInFormData['technicalState']) => ({
    // Legacy single-field consumers (calendar tooltips, reminders) still read `note`.
    note: technicalState.inspectionNotes || undefined,
    internalNote: technicalState.inspectionNotes || undefined,
    protocolNote: technicalState.protocolNotes || undefined,
});

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
                    company: formData.company
                        ? {
                            name: formData.company.name,
                            nip: formData.company.nip,
                            regon: formData.company.regon,
                            address: `${formData.company.address.street}, ${formData.company.address.postalCode} ${formData.company.address.city}`,
                          }
                        : undefined,
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
                        company: formData.company
                            ? {
                                name: formData.company.name,
                                nip: formData.company.nip,
                                regon: formData.company.regon,
                                address: `${formData.company.address.street}, ${formData.company.address.postalCode} ${formData.company.address.city}`,
                              }
                            : undefined,
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
                        brand: formData.vehicleData.brand,
                        model: formData.vehicleData.model,
                        // Wire key is `year`, not `yearOfProduction` (which is only the
                        // internal form-state field name) — the backend's
                        // NewVehicleDataRequest DTO has no alias for the old key, and
                        // Jackson silently drops unknown properties, so sending the
                        // wrong key here means "rok produkcji" is never persisted.
                        year: formData.vehicleData.yearOfProduction,
                        licensePlate: formData.vehicleData.licensePlate || undefined,
                        color: formData.vehicleData.color,
                    },
                }
                : {
                    mode: 'UPDATE',
                    id: formData.vehicleData.id,
                    updateData: {
                        brand: formData.vehicleData.brand,
                        model: formData.vehicleData.model,
                        year: formData.vehicleData.yearOfProduction,
                        licensePlate: formData.vehicleData.licensePlate || undefined,
                        color: formData.vehicleData.color,
                    },
                },
        services: formData.services.map(toApiServiceLineItem),
        schedule: {
            isAllDay: formData.isAllDay ?? false,
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
