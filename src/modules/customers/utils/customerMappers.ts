import type { Customer, CustomerRevenue, CreateCustomerPayload } from '../types';
import type { CreateCustomerFormData } from './customerValidation';

export const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
    }).format(amount);
};

export const formatRevenue = (revenue: CustomerRevenue): string => {
    const net = formatCurrency(revenue.netAmount, revenue.currency);
    const gross = formatCurrency(revenue.grossAmount, revenue.currency);
    return `${net} / ${gross}`;
};

export const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';

    return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(dateString));
};

export const formatPhoneNumber = (phone: string): string => {
    const clean = phone.replace(/[\s-]/g, '').replace(/^\+48/, '');
    return `+48 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};

export const getFullName = (customer: Customer): string => {
    return `${customer.firstName} ${customer.lastName}`;
};

export const mapFormDataToPayload = (
    data: CreateCustomerFormData
): CreateCustomerPayload => ({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.replace(/[\s-]/g, ''),
    homeAddress: data.homeAddress,
    company: data.company,
    notes: data.notes.trim(),
});