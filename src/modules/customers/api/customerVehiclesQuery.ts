// src/modules/customers/api/customerVehiclesQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { customerDetailApi } from './customerDetailApi';

export const CUSTOMER_VEHICLES_KEY = 'customerVehicles';

/**
 * Auta klienta - kartoteka, okno rezerwacji, przyjęcie i wybór pojazdu. Dawniej moduł
 * rezerwacji miał własne wywołanie i klucz, więc „Rozpocznij wizytę" z karty klienta
 * pobierało tę samą listę drugi raz, a dodanie auta w kartotece nie odświeżało przyjęcia.
 * W cache leży surowa odpowiedź; kartoteka mapuje ją przez `select`.
 */
export const customerVehiclesQuery = (customerId: string, includeDeleted = false) => queryOptions({
    queryKey: [CUSTOMER_VEHICLES_KEY, customerId, includeDeleted],
    queryFn: () => customerDetailApi.getCustomerVehicles(customerId, includeDeleted),
});
