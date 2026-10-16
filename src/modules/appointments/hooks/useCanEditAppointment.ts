import { usePersonalDataActions } from '@/core/permissions/personalDataActions';

/**
 * Czy ten użytkownik może otworzyć edycję rezerwacji: VISITS_CREATE i dane osobowe
 * (CUSTOMERS_VIEW). Reguła i jej uzasadnienie mieszkają w `personalDataActions` - tu
 * tylko skrót dla miejsc, które pytają wyłącznie o edycję rezerwacji.
 */
export function useCanEditAppointment(): boolean {
    return usePersonalDataActions().canEditAppointment;
}
