export { CustomerCard } from './CustomerCard';
export { VehicleCard } from './VehicleCard';
export { entitySectionsReducer, hasUnresolvedSection } from './reducer';
export { toCustomerIdentity, toVehicleIdentity } from './mapToPayload';
export type {
    CustomerSectionState,
    CustomerSummary,
    EntityEvent,
    EntitySectionsState,
    VehicleSectionState,
    VehicleSummary,
} from './types';
