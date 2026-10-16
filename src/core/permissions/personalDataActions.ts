import { useMemo } from 'react';
import type { AccessRequirement } from './catalog';
import { usePermissions } from './usePermissions';

/**
 * Akcje, które wymagają danych osobowych klienta (CUSTOMERS_VIEW) obok prawa do
 * rezerwacji i wizyt (VISITS_CREATE): nowa rezerwacja, edycja rezerwacji, nowa wizyta
 * (przyjęcie z rezerwacji i „z marszu") oraz edycja wizyty.
 *
 * Dlaczego samo VISITS_CREATE nie wystarcza: w drzewie uprawnień VISITS_CREATE leży pod
 * CUSTOMERS_VIEW, ale bramka planu (moduł „Klienci" wyłączony) zdejmuje CUSTOMERS_VIEW
 * i zostawia VISITS_CREATE. Taki użytkownik widzi klienta zamaskowanego (`***`), więc:
 * - formularz rezerwacji i przyjęcia każe wpisać albo wybrać klienta, którego nie widzi,
 * - formularz edycji wysyła klienta w całości i nadpisałby go gwiazdkami.
 * Serwer odrzuca te zapisy (403, `@RequiresPermission(..., allOf = true)`); tu chowamy
 * wejścia, żeby nikt do nich nie doszedł - przycisku nie ma, a nie jest wyszarzony.
 *
 * „Edycja wizyty" to zmiana jej treści: usługi i ceny (także akceptacja/odrzucenie
 * pozycji czekającej na klienta, rabat i VAT zbiorczy), tytuł, termin odbioru,
 * Door to Door, stan przy przyjęciu, notatka techniczna, e-mail klienta i SMS
 * przypominający. NIE jest nią praca na hali, którą wykonuje się bez danych osobowych:
 * zmiany statusu (rozpoczęcie, gotowe do odbioru, wydanie, odrzucenie), komentarze,
 * zdjęcia i pliki, mapa uszkodzeń, lista kontrolna usług, certyfikat i produkty - te
 * zostają przy swoich dotychczasowych uprawnieniach.
 *
 * Anulowanie, przywrócenie i usunięcie rezerwacji klienta nie niosą, więc też zostają
 * przy samym VISITS_CREATE i nie korzystają z tej funkcji.
 */
export interface PersonalDataActions {
    canCreateAppointment: boolean;
    canEditAppointment: boolean;
    canCreateVisit: boolean;
    canEditVisit: boolean;
}

export type PersonalDataAction = keyof PersonalDataActions;

export function personalDataActions(can: (required: AccessRequirement) => boolean): PersonalDataActions {
    // Dziś jedna reguła dla wszystkich czterech akcji. Osobne pola, bo każde wejście
    // pyta o swoją akcję - gdyby reguły się rozjechały, zmienia się tylko to miejsce.
    const allowed = can('VISITS_CREATE') && can('CUSTOMERS_VIEW');
    return {
        canCreateAppointment: allowed,
        canEditAppointment: allowed,
        canCreateVisit: allowed,
        canEditVisit: allowed,
    };
}

export function usePersonalDataActions(): PersonalDataActions {
    const { can } = usePermissions();
    return useMemo(() => personalDataActions(can), [can]);
}
