export { VehicleListView } from './views/VehicleListView';
export { VehicleDetailView } from './views/VehicleDetailView';

export {
    useVehicles,
    vehiclesQueryKey,
    useVehicleDetail,
    vehicleDetailQueryKey,
    useCreateVehicle,
    useUpdateVehicle,
    useDeleteVehicle,
    useVehicleSearch,
    useVehiclePagination,
    useOwnerManagement,
} from './hooks';

export { vehicleApi } from './api/vehicleApi';

export { VehicleTable } from './components/VehicleTable';
export { VehicleGrid } from './components/VehicleGrid';
export { VehicleCard } from './components/VehicleCard';
export { VehicleSearchFilter } from './components/VehicleSearchFilter';
export { VehiclePagination } from './components/VehiclePagination';
export { VehicleHeader } from './components/VehicleHeader';
export { VehicleOwnerManager } from './components/VehicleOwnerManager';
export { VehicleActivityTimeline } from './components/VehicleActivityTimeline';
export { VehicleVisitHistory } from './components/VehicleVisitHistory';
export { VehiclePhotoGallery } from './components/VehiclePhotoGallery';
export { EditVehicleModal } from './components/EditVehicleModal';
export { EditOwnersModal } from './components/EditOwnersModal';

export type {
    Vehicle,
    VehicleListItem,
    VehicleListResponse,
    VehicleDetailResponse,
    VehicleFilters,
    VehicleSortField,
    SortDirection,
    CreateVehiclePayload,
    UpdateVehiclePayload,
    AssignOwnerPayload,
    VehicleOwner,
    VehicleFinancialStats,
    VehicleStatus,
    EngineType,
    OwnershipRole,
    VehicleDocument,
    VehiclePhoto,
    VehicleActivity,
    VehicleVisitSummary,
    PaginationMeta,
} from './types';
