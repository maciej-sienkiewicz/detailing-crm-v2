export { AppointmentCreateView } from './views/AppointmentCreateView';
export { appointmentApi } from './api/appointmentApi';
export { useAppointmentForm, useServices, useCustomerSearch, useCustomerVehicles } from './hooks/useAppointmentForm';
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
    MoneyAmount,
    AdjustmentType,
    ServiceLineItem,
    SelectedCustomer,
    SelectedVehicle,
} from './types';