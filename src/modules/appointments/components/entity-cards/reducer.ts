import type {
    CustomerSectionState,
    EntityEvent,
    EntitySectionsState,
    VehicleSectionResolved,
    VehicleSectionState,
} from './types';

const EMPTY_CUSTOMER_DRAFT = { firstName: '', lastName: '', phone: '', email: '' };
const EMPTY_VEHICLE_DRAFT = { brand: '', model: '', year: undefined, licensePlate: '' };

const resolvedVehicle = (state: VehicleSectionState): VehicleSectionResolved =>
    state.kind === 'CHOOSING' || state.kind === 'EDITING' ? state.base : state;

const resolvedCustomer = (
    state: CustomerSectionState,
): Exclude<CustomerSectionState, { kind: 'EDITING' } | { kind: 'CHOOSING' }> =>
    state.kind === 'EDITING' || state.kind === 'CHOOSING' ? state.base : state;

const draftsEqual = <T extends Record<string, unknown>>(a: T, b: T): boolean =>
    Object.keys({ ...a, ...b }).every(key => (a[key] ?? '') === (b[key] ?? ''));

/**
 * Single source of truth for both sections, so the cross-section contract
 * ("customer changed ⇒ vehicle re-resolves against the new garage") lives in
 * exactly one place instead of effects scattered across components.
 */
export function entitySectionsReducer(state: EntitySectionsState, event: EntityEvent): EntitySectionsState {
    switch (event.type) {
        // ── Customer ────────────────────────────────────────────────────────
        case 'CUSTOMER_OPEN_SEARCH':
            return { ...state, customer: { kind: 'CHOOSING', base: resolvedCustomer(state.customer) } };
        case 'CUSTOMER_CANCEL_SEARCH':
            return state.customer.kind === 'CHOOSING'
                ? { ...state, customer: state.customer.base }
                : state;
        case 'CUSTOMER_SELECTED':
            // Re-selection resets the vehicle: the old customer's vehicle must never
            // silently survive an owner change. The vehicle card auto-resolves the
            // CHOOSING state from the new garage (0 → new form, 1 → auto-select, n → list).
            return {
                customer: { kind: 'SELECTED', snapshot: event.customer },
                vehicle: { kind: 'CHOOSING', base: { kind: 'NONE' }, auto: true },
            };
        case 'CUSTOMER_CREATE_NEW':
            // A brand-new customer has an empty garage by definition → go straight
            // to the new-vehicle form (no picker with zero options).
            return {
                customer: { kind: 'NEW', draft: { ...EMPTY_CUSTOMER_DRAFT } },
                vehicle: { kind: 'NEW', draft: { ...EMPTY_VEHICLE_DRAFT } },
            };
        case 'CUSTOMER_NEW_DRAFT_CHANGED':
            return state.customer.kind === 'NEW'
                ? { ...state, customer: { kind: 'NEW', draft: event.draft } }
                : state;
        case 'CUSTOMER_OPEN_EDIT': {
            const base = resolvedCustomer(state.customer);
            const draft = base.kind === 'SELECTED'
                ? { firstName: base.snapshot.firstName, lastName: base.snapshot.lastName, phone: base.snapshot.phone, email: base.snapshot.email }
                : base.kind === 'SELECTED_MODIFIED' ? { ...base.draft }
                : { ...base.draft };
            return { ...state, customer: { kind: 'EDITING', base, draft } };
        }
        case 'CUSTOMER_CANCEL_EDIT':
            return state.customer.kind === 'EDITING'
                ? { ...state, customer: state.customer.base }
                : state;
        case 'CUSTOMER_COMMIT_EDIT': {
            if (state.customer.kind !== 'EDITING') return state;
            const base = state.customer.base;
            if (base.kind === 'NEW') {
                return { ...state, customer: { kind: 'NEW', draft: event.draft } };
            }
            const snapshot = base.snapshot;
            const unchanged = draftsEqual(event.draft, {
                firstName: snapshot.firstName, lastName: snapshot.lastName, phone: snapshot.phone, email: snapshot.email,
            });
            // A no-op edit degrades back to a pure reference — no empty UPDATE reported.
            return {
                ...state,
                customer: unchanged
                    ? { kind: 'SELECTED', snapshot }
                    : { kind: 'SELECTED_MODIFIED', snapshot, draft: event.draft },
            };
        }
        case 'CUSTOMER_DISCARD_CHANGES':
            return state.customer.kind === 'SELECTED_MODIFIED'
                ? { ...state, customer: { kind: 'SELECTED', snapshot: state.customer.snapshot } }
                : state;

        // ── Vehicle ─────────────────────────────────────────────────────────
        case 'VEHICLE_OPEN_CHOOSER':
            return { ...state, vehicle: { kind: 'CHOOSING', base: resolvedVehicle(state.vehicle) } };
        case 'VEHICLE_CANCEL_CHOOSER':
            return state.vehicle.kind === 'CHOOSING'
                ? { ...state, vehicle: state.vehicle.base }
                : state;
        case 'VEHICLE_SELECTED':
            return { ...state, vehicle: { kind: 'SELECTED', snapshot: event.vehicle } };
        case 'VEHICLE_ADD_NEW':
            return { ...state, vehicle: { kind: 'NEW', draft: { ...EMPTY_VEHICLE_DRAFT } } };
        case 'VEHICLE_NEW_DRAFT_CHANGED':
            return state.vehicle.kind === 'NEW'
                ? { ...state, vehicle: { ...state.vehicle, draft: event.draft } }
                : state;
        case 'VEHICLE_OPEN_EDIT': {
            const base = resolvedVehicle(state.vehicle);
            if (base.kind === 'NONE' || base.kind === 'LINKED_EXISTING') return state;
            const draft = base.kind === 'SELECTED'
                ? {
                    brand: base.snapshot.brand,
                    model: base.snapshot.model,
                    year: base.snapshot.year,
                    licensePlate: base.snapshot.licensePlate ?? '',
                    vin: base.snapshot.vin,
                    color: base.snapshot.color,
                }
                : { ...base.draft };
            return { ...state, vehicle: { kind: 'EDITING', base, draft } };
        }
        case 'VEHICLE_CANCEL_EDIT':
            return state.vehicle.kind === 'EDITING'
                ? { ...state, vehicle: state.vehicle.base }
                : state;
        case 'VEHICLE_COMMIT_EDIT': {
            if (state.vehicle.kind !== 'EDITING') return state;
            const base = state.vehicle.base;
            if (base.kind === 'NEW') {
                return { ...state, vehicle: { ...base, draft: event.draft } };
            }
            if (base.kind !== 'SELECTED' && base.kind !== 'SELECTED_MODIFIED') return state;
            const snapshot = base.snapshot;
            const unchanged = draftsEqual(
                { brand: event.draft.brand, model: event.draft.model, year: event.draft.year ?? '', licensePlate: event.draft.licensePlate ?? '', vin: event.draft.vin ?? '', color: event.draft.color ?? '' },
                { brand: snapshot.brand, model: snapshot.model, year: snapshot.year ?? '', licensePlate: snapshot.licensePlate ?? '', vin: snapshot.vin ?? '', color: snapshot.color ?? '' },
            );
            return {
                ...state,
                vehicle: unchanged
                    ? { kind: 'SELECTED', snapshot }
                    : { kind: 'SELECTED_MODIFIED', snapshot, draft: event.draft },
            };
        }
        case 'VEHICLE_DISCARD_CHANGES':
            return state.vehicle.kind === 'SELECTED_MODIFIED'
                ? { ...state, vehicle: { kind: 'SELECTED', snapshot: state.vehicle.snapshot } }
                : state;
        case 'VEHICLE_CLEAR':
            return { ...state, vehicle: { kind: 'NONE' } };
        case 'VEHICLE_LINK_EXISTING':
            return { ...state, vehicle: { kind: 'LINKED_EXISTING', vehicle: event.vehicle, ownership: event.ownership } };
        case 'VEHICLE_DUPLICATE_OVERRIDE':
            return state.vehicle.kind === 'NEW'
                ? { ...state, vehicle: { ...state.vehicle, duplicateOverrideVehicleId: event.vehicleId } }
                : state;
    }
}

/** True while any card is in a transient state — the visit must not be saved yet. */
export const hasUnresolvedSection = (state: EntitySectionsState): boolean =>
    state.customer.kind === 'EDITING' || state.customer.kind === 'CHOOSING' ||
    state.vehicle.kind === 'EDITING' || state.vehicle.kind === 'CHOOSING';
