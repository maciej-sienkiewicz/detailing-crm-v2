// Entity-card state machines for the visit edit form.
//
// The core idea: selection, mutation and creation of customer/vehicle are three
// different operations, so they are three different states — never one set of
// hot inputs whose intent the system has to guess. Illegal combinations
// (e.g. "new" with an id) are unrepresentable by construction.

export interface CustomerSummary {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

export type CustomerDraft = Omit<CustomerSummary, 'id'>;

export interface VehicleSummary {
    id: string;
    brand: string;
    model: string;
    year?: number;
    licensePlate?: string;
    /** Check-in extras — carried through so the wizard round-trips them losslessly. */
    vin?: string;
    color?: string;
}

export type VehicleDraft = Omit<VehicleSummary, 'id'>;

export type VehicleOwnershipAction = 'ADD_CO_OWNER' | 'TRANSFER_PRIMARY';

/** Result of the live license-plate lookup — powers the collision card. */
export interface PlateCollision {
    vehicleId: string;
    brand: string;
    model: string;
    year?: number | null;
    licensePlate?: string | null;
    primaryOwnerName?: string | null;
}

// ─── Customer section ─────────────────────────────────────────────────────────

export type CustomerSectionState =
    /** A reference to an existing customer. Read-only card, zero mutation risk. */
    | { kind: 'SELECTED'; snapshot: CustomerSummary }
    /** Reference + a deliberately confirmed edit; UPDATE is sent on save. */
    | { kind: 'SELECTED_MODIFIED'; snapshot: CustomerSummary; draft: CustomerDraft }
    /** A brand-new customer created in-flight. */
    | { kind: 'NEW'; draft: CustomerDraft }
    /** Transient: edit form open. Blocks saving the visit until resolved. */
    | { kind: 'EDITING'; base: Exclude<CustomerSectionState, { kind: 'EDITING' } | { kind: 'CHOOSING' }>; draft: CustomerDraft }
    /** Transient: search open ("Zmień klienta"). `base` restores on cancel. */
    | { kind: 'CHOOSING'; base: Exclude<CustomerSectionState, { kind: 'EDITING' } | { kind: 'CHOOSING' }> };

// ─── Vehicle section ──────────────────────────────────────────────────────────

export type VehicleSectionResolved =
    | { kind: 'NONE' }
    | { kind: 'SELECTED'; snapshot: VehicleSummary }
    | { kind: 'SELECTED_MODIFIED'; snapshot: VehicleSummary; draft: VehicleDraft }
    /** Existing vehicle attached via the collision card, with an explicit ownership decision. */
    | { kind: 'LINKED_EXISTING'; vehicle: VehicleSummary; ownership: VehicleOwnershipAction }
    | { kind: 'NEW'; draft: VehicleDraft; duplicateOverrideVehicleId?: string };

export type VehicleSectionState =
    | VehicleSectionResolved
    /**
     * Transient: garage picker open. `auto` marks the picker as entered by the
     * customer-changed rule — only then does it self-resolve trivial garages
     * (0 vehicles → new-vehicle form, 1 vehicle → auto-select). A picker opened
     * manually ("Zmień pojazd") never auto-selects under the user's hands.
     */
    | { kind: 'CHOOSING'; base: VehicleSectionResolved; auto?: boolean }
    /** Transient: edit form open. */
    | { kind: 'EDITING'; base: VehicleSectionResolved; draft: VehicleDraft };

export interface EntitySectionsState {
    customer: CustomerSectionState;
    vehicle: VehicleSectionState;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EntityEvent =
    // customer
    | { type: 'CUSTOMER_OPEN_SEARCH' }
    | { type: 'CUSTOMER_CANCEL_SEARCH' }
    /** Re-selection. Resets the vehicle section — see reducer for the cross-section contract. */
    | { type: 'CUSTOMER_SELECTED'; customer: CustomerSummary }
    | { type: 'CUSTOMER_CREATE_NEW' }
    | { type: 'CUSTOMER_OPEN_EDIT' }
    | { type: 'CUSTOMER_CANCEL_EDIT' }
    | { type: 'CUSTOMER_COMMIT_EDIT'; draft: CustomerDraft }
    | { type: 'CUSTOMER_DISCARD_CHANGES' }
    | { type: 'CUSTOMER_NEW_DRAFT_CHANGED'; draft: CustomerDraft }
    // vehicle
    | { type: 'VEHICLE_OPEN_CHOOSER' }
    | { type: 'VEHICLE_CANCEL_CHOOSER' }
    | { type: 'VEHICLE_SELECTED'; vehicle: VehicleSummary }
    | { type: 'VEHICLE_ADD_NEW' }
    | { type: 'VEHICLE_NEW_DRAFT_CHANGED'; draft: VehicleDraft }
    | { type: 'VEHICLE_OPEN_EDIT' }
    | { type: 'VEHICLE_CANCEL_EDIT' }
    | { type: 'VEHICLE_COMMIT_EDIT'; draft: VehicleDraft }
    | { type: 'VEHICLE_DISCARD_CHANGES' }
    | { type: 'VEHICLE_CLEAR' }
    /** Collision card: attach the already-existing vehicle instead of creating a duplicate. */
    | { type: 'VEHICLE_LINK_EXISTING'; vehicle: VehicleSummary; ownership: VehicleOwnershipAction }
    /** Collision card: "it's a different vehicle" — allow the duplicate plate knowingly. */
    | { type: 'VEHICLE_DUPLICATE_OVERRIDE'; vehicleId: string };
