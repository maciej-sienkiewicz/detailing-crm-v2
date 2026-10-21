// src/modules/appointments/index.ts
export { AppointmentEditView } from './views/AppointmentEditView';
export { appointmentApi } from './api/appointmentApi';
export {
    useAppointmentForm,
    useAppointmentServices,
    useCustomerSearch,
    useCustomerVehicles,
    useAppointmentColors,
} from './hooks/useAppointmentForm';
export { formatMoneyAmount, parseMoneyAmount } from './hooks/usePriceCalculator';
export { useServicePricing } from './hooks/useServicePricing';

export type {
    AppointmentCreateRequest,
    CustomerIdentity,
    VehicleIdentity,
    PriceAdjustment,
    Service,
    Customer,
    Vehicle,
    AppointmentColor,
    MoneyAmount,
    AdjustmentType,
    ServiceLineItem,
    SelectedCustomer,
    SelectedVehicle,
} from './types';