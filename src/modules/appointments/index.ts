// src/modules/appointments/index.ts
export { AppointmentCreateView } from './views/AppointmentCreateView';
export { appointmentApi } from './api/appointmentApi';
export {
    useAppointmentForm,
    useAppointmentServices,
    useCustomerSearch,
    useCustomerVehicles,
    useAppointmentColors,
} from './hooks/useAppointmentForm';
export { useAppointmentCreation } from './hooks/useAppointmentCreation';
export { formatMoneyAmount, parseMoneyAmount } from './hooks/usePriceCalculator';
export { useServicePricing } from './hooks/useServicePricing';
export { useInvoiceManagement } from './hooks/useInvoiceManagement';

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