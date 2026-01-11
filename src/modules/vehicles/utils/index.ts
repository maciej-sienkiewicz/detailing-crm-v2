export {
    createVehicleSchema,
    updateVehicleSchema,
} from './vehicleValidation';

export type {
    CreateVehicleFormData,
    UpdateVehicleFormData,
} from './vehicleValidation';

export {
    formatLicensePlate,
    formatVin,
    getVehicleDisplayName,
    getVehicleShortName,
} from './vehicleMappers';