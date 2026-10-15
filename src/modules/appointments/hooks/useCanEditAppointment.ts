import { usePermissions } from '@/core/permissions';

/**
 * Czy ten użytkownik może otworzyć edycję rezerwacji.
 *
 * Poza samym prawem do rezerwacji (VISITS_CREATE) potrzebne są dane osobowe
 * (CUSTOMERS_VIEW). Bez nich serwer odsyła klienta zamaskowanego (`***`), a formularz
 * edycji wysyła klienta w całości - zapis nadpisałby imię, telefon i e-mail gwiazdkami.
 * Serwer odrzuca taki zapis (403), a tu chowamy wejście, żeby nikt do niego nie doszedł.
 *
 * Anulowanie, przywrócenie i usunięcie rezerwacji klienta nie niosą, więc zostają
 * przy samym VISITS_CREATE i nie korzystają z tej funkcji.
 */
export function useCanEditAppointment(): boolean {
    const { can } = usePermissions();
    return can('VISITS_CREATE') && can('CUSTOMERS_VIEW');
}
