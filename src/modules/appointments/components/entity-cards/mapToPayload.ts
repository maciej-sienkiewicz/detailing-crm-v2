import type { CustomerIdentity, VehicleIdentity } from '../../types';
import type { CustomerSectionState, VehicleSectionState } from './types';

interface CompanyPayload {
    name: string;
    nip: string;
    regon?: string;
    address: string;
}

/**
 * Pure state → API mapping. The mode is read off the state kind, never inferred
 * from which fields happen to be filled, so the backend gets an unambiguous
 * instruction for the Customer-Vehicle-Visit relations.
 *
 * Returns null for transient states (EDITING/CHOOSING): the caller must block
 * the save and point the user at the unresolved card.
 */
export function toCustomerIdentity(
    state: CustomerSectionState,
    company?: CompanyPayload,
): CustomerIdentity | null {
    switch (state.kind) {
        case 'SELECTED':
            return { mode: 'EXISTING', id: state.snapshot.id };
        case 'SELECTED_MODIFIED':
            return {
                mode: 'UPDATE',
                id: state.snapshot.id,
                updateData: {
                    firstName: state.draft.firstName || null,
                    lastName: state.draft.lastName || null,
                    phone: state.draft.phone || null,
                    email: state.draft.email || null,
                    company,
                },
            };
        case 'NEW':
            return {
                mode: 'NEW',
                newData: {
                    firstName: state.draft.firstName || null,
                    lastName: state.draft.lastName || null,
                    phone: state.draft.phone || null,
                    email: state.draft.email || null,
                    company,
                },
            };
        case 'EDITING':
        case 'CHOOSING':
            return null;
    }
}

export function toVehicleIdentity(state: VehicleSectionState): VehicleIdentity | null {
    switch (state.kind) {
        case 'NONE':
            return { mode: 'NONE' };
        case 'SELECTED':
            return { mode: 'EXISTING', id: state.snapshot.id };
        case 'SELECTED_MODIFIED':
            return {
                mode: 'UPDATE',
                id: state.snapshot.id,
                updateData: {
                    brand: state.draft.brand,
                    model: state.draft.model,
                    year: state.draft.year,
                    licensePlate: state.draft.licensePlate || undefined,
                },
            };
        case 'NEW': {
            // An untouched auto-opened form degrades to "no vehicle": the empty-garage
            // auto-progression must not make the vehicle silently mandatory.
            const d = state.draft;
            const empty = !d.brand.trim() && !d.model.trim() && !(d.licensePlate ?? '').trim();
            if (empty) return { mode: 'NONE' };
            return {
                mode: 'NEW',
                newData: {
                    brand: d.brand,
                    model: d.model,
                    year: d.year,
                    licensePlate: d.licensePlate || undefined,
                },
                duplicateOverrideVehicleId: state.duplicateOverrideVehicleId,
            };
        }
        case 'LINKED_EXISTING':
            return { mode: 'LINK_EXISTING', id: state.vehicle.id, ownership: state.ownership };
        case 'CHOOSING':
        case 'EDITING':
            return null;
    }
}
