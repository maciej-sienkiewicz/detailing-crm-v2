// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { User } from '@/modules/auth/types';
import { hasPermission } from './helpers';
import { personalDataActions } from './personalDataActions';
import type { AccessRequirement } from './catalog';

// Reguła z personalDataActions: nowa rezerwacja, edycja rezerwacji, nowa wizyta i edycja
// wizyty wymagają VISITS_CREATE ORAZ danych osobowych (CUSTOMERS_VIEW). Bramka planu
// potrafi zdjąć CUSTOMERS_VIEW i zostawić VISITS_CREATE - wtedy wszystkich czterech nie ma.
const actionsFor = (permissions: string[] | null) => {
    const user = { email: 'u@studio.pl', permissions } as unknown as User;
    return personalDataActions((required: AccessRequirement) => hasPermission(user, required));
};

const none = { canCreateAppointment: false, canEditAppointment: false, canCreateVisit: false, canEditVisit: false };
const all = { canCreateAppointment: true, canEditAppointment: true, canCreateVisit: true, canEditVisit: true };

describe('personalDataActions', () => {
    it('VISITS_CREATE bez danych osobowych (bramka planu) nie daje żadnej z akcji', () => {
        expect(actionsFor(['VISITS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'])).toEqual(none);
    });

    it('same dane osobowe bez VISITS_CREATE też nie', () => {
        expect(actionsFor(['VISITS_VIEW', 'CUSTOMERS_VIEW'])).toEqual(none);
    });

    it('detailer z samym podglądem wizyt nie tworzy ani nie edytuje', () => {
        expect(actionsFor(['VISITS_VIEW'])).toEqual(none);
    });

    it('VISITS_CREATE z danymi osobowymi daje wszystkie cztery', () => {
        expect(actionsFor(['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_SERVICE_PRICES_VIEW', 'VISITS_CREATE'])).toEqual(all);
    });

    it('właściciel (permissions == null) ma wszystkie', () => {
        expect(actionsFor(null)).toEqual(all);
    });
});
