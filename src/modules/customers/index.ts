export { CustomerListView } from './views/CustomerListView';

export { useCustomers, customersQueryKey } from './hooks/useCustomers';
export { useCreateCustomer } from './hooks/useCreateCustomer';
export { useCustomerSearch } from './hooks/useCustomerSearch';
export { useCustomerPagination } from './hooks/useCustomerPagination';

export { customerApi } from './api/customerApi';

export { AddCustomerModal } from './components/AddCustomerModal';
export { CustomerTable } from './components/CustomerTable';
export { CustomerGrid } from './components/CustomerGrid';
export { CustomerCard } from './components/CustomerCard';
export { CustomerSearchFilter } from './components/CustomerSearchFilter';
export { CustomerPagination } from './components/CustomerPagination';
export { CustomerForm } from './components/CustomerForm';
export { EmptyState } from './components/EmptyState';

export {
    formatRevenue,
    formatDate,
    formatPhoneNumber,
    getFullName,
    mapFormDataToPayload,
} from './utils/customerMappers';

export {
    createCustomerSchema,
    customerSearchSchema,
} from './utils/customerValidation';

export {
    validatePolishNip,
    validatePolishRegon,
    formatNip,
    formatRegon,
} from './utils/polishValidators';

export type {
    Customer,
    CompanyDetails,
    CompanyAddress,
    HomeAddress,
    CustomerContact,
    CustomerRevenue,
    CustomerListResponse,
    PaginationMeta,
    CustomerFilters,
    CreateCustomerPayload,
    CustomerSortField,
    SortDirection,
} from './types';

export type { CreateCustomerFormData } from './utils/customerValidation';