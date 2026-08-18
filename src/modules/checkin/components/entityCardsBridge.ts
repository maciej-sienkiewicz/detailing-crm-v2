// Bridge between the entity-card state machines (appointments/entity-cards)
// and the check-in wizard's CheckInFormData.
//
// The check-in submit path, validation and photo steps all read CheckInFormData,
// so during check-in the cards act as a UI facade: every card transition is
// synced back into formData (customerData/isNewCustomer/vehicleData/isNewVehicle)
// and the existing payload builder keeps working unchanged.

import type { CheckInFormData } from '../types';
import type { EntitySectionsState } from '@/modules/appointments/components/entity-cards';

type ResolvedCustomer = Exclude<EntitySectionsState['customer'], { kind: 'EDITING' } | { kind: 'CHOOSING' }>;
type ResolvedVehicle = Exclude<EntitySectionsState['vehicle'], { kind: 'EDITING' } | { kind: 'CHOOSING' }>;

const resolveCustomer = (s: EntitySectionsState['customer']): ResolvedCustomer =>
    s.kind === 'EDITING' || s.kind === 'CHOOSING' ? s.base : s;

const resolveVehicle = (s: EntitySectionsState['vehicle']): ResolvedVehicle =>
    s.kind === 'EDITING' || s.kind === 'CHOOSING' ? s.base : s;

/** Seed the card state from the wizard's (possibly prefilled) form data. */
export const initEntitiesFromFormData = (fd: CheckInFormData): EntitySectionsState => {
    const c = fd.customerData;
    const hasCustomerDraft = !!(c.firstName || c.lastName || c.phone || c.email);

    const customer: EntitySectionsState['customer'] = c.id
        ? {
            kind: 'SELECTED',
            snapshot: { id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email },
        }
        : hasCustomerDraft
            ? { kind: 'NEW', draft: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email } }
            // Walk-in cold start: search-first, returning customers are the fast path,
            // "+ Dodaj nowego klienta" is one tap away.
            : {
                kind: 'CHOOSING',
                base: { kind: 'NEW', draft: { firstName: '', lastName: '', phone: '', email: '' } },
            };

    const v = fd.vehicleData;
    const vehicle: EntitySectionsState['vehicle'] = v?.id
        ? {
            kind: 'SELECTED',
            snapshot: {
                id: v.id, brand: v.brand, model: v.model,
                year: v.yearOfProduction, licensePlate: v.licensePlate,
                vin: v.vin, color: v.color,
            },
        }
        : v
            ? {
                kind: 'NEW',
                draft: {
                    brand: v.brand, model: v.model,
                    year: v.yearOfProduction, licensePlate: v.licensePlate ?? '',
                    vin: v.vin, color: v.color,
                },
            }
            : { kind: 'NONE' };

    return { customer, vehicle };
};

/**
 * Project the card state back onto formData. Transient states (EDITING/CHOOSING)
 * project their base, so half-typed edits never leak into the submit payload.
 */
export const entitiesToFormData = (state: EntitySectionsState): Partial<CheckInFormData> => {
    const customer = resolveCustomer(state.customer);
    const vehicle = resolveVehicle(state.vehicle);

    const customerPatch: Partial<CheckInFormData> =
        customer.kind === 'SELECTED'
            ? {
                // hasFullCustomerData intentionally untouched: a legacy record with
                // missing contact data must not start failing validation just because
                // the card projected its snapshot back.
                customerData: { ...customer.snapshot },
                isNewCustomer: false,
            }
            : customer.kind === 'SELECTED_MODIFIED'
                ? {
                    customerData: { id: customer.snapshot.id, ...customer.draft },
                    isNewCustomer: false,
                    hasFullCustomerData: true,
                }
                : {
                    customerData: { id: '', ...customer.draft },
                    isNewCustomer: true,
                    hasFullCustomerData: true,
                };

    const vehiclePatch: Partial<CheckInFormData> = (() => {
        switch (vehicle.kind) {
            case 'NONE':
                return { vehicleData: null, isNewVehicle: false };
            case 'SELECTED':
            case 'LINKED_EXISTING': {
                const v = vehicle.kind === 'SELECTED' ? vehicle.snapshot : vehicle.vehicle;
                return {
                    vehicleData: {
                        id: v.id, brand: v.brand, model: v.model,
                        yearOfProduction: v.year, licensePlate: v.licensePlate,
                        vin: v.vin, color: v.color,
                    },
                    isNewVehicle: false,
                };
            }
            case 'SELECTED_MODIFIED':
                return {
                    vehicleData: {
                        id: vehicle.snapshot.id,
                        brand: vehicle.draft.brand, model: vehicle.draft.model,
                        yearOfProduction: vehicle.draft.year, licensePlate: vehicle.draft.licensePlate,
                        vin: vehicle.draft.vin, color: vehicle.draft.color,
                    },
                    isNewVehicle: false,
                };
            case 'NEW':
                return {
                    vehicleData: {
                        id: '',
                        brand: vehicle.draft.brand, model: vehicle.draft.model,
                        yearOfProduction: vehicle.draft.year, licensePlate: vehicle.draft.licensePlate,
                        vin: vehicle.draft.vin, color: vehicle.draft.color,
                    },
                    isNewVehicle: true,
                };
        }
    })();

    return { ...customerPatch, ...vehiclePatch };
};
