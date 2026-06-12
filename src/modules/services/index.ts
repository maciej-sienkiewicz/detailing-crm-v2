// src/modules/services/index.ts
export {
    useServices,
    useCreateService,
    useUpdateService,
    useArchiveService,
    useCreatePackage,
    useUpdatePackage,
    useSyncItemName,
} from './hooks/useServices';
export type {
    Service,
    ServiceListFilters,
    VatRate,
    PackageItemDto,
    AffectedPackage,
    CreatePackageRequest,
    UpdatePackageRequest,
    SyncItemNameRequest,
} from './types';
