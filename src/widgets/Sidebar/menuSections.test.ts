// Panel boczny po wyjściu „Pracowników" z Ustawień: pozycja stoi w sekcji „Firma" dla
// każdego z ANY_EMPLOYEES i prowadzi na pierwszą zakładkę, do której użytkownik ma
// dostęp (kierownik zmiany nie może trafić na przekierowanie). „Urlop" widzi tylko
// konto z rekordem pracownika.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/core/permissions/helpers';
import type { PermissionRequirement } from '@/core/permissions/catalog';
import type { User } from '@/modules/auth/types';
import { buildMenuSections, type MenuSectionsInput } from './menuSections';

const canFor = (permissions: string[] | null) => (required: PermissionRequirement) =>
    hasPermission({ permissions } as User, required);

const build = (overrides: Partial<MenuSectionsInput> & { permissions?: string[] | null }) => {
    const { permissions = null, ...rest } = overrides;
    return buildMenuSections({
        newLeadsCount: 0,
        unreadMailCount: 0,
        unreadNotifications: 0,
        pendingLeaveRequests: 0,
        can: canFor(permissions),
        trackWorkTime: false,
        hasEmployeeRecord: false,
        onReportProblem: () => undefined,
        ...rest,
    });
};

const item = (sections: ReturnType<typeof build>, label: string) =>
    sections.flatMap(s => s.items.map(i => ({ ...i, section: s.title }))).find(i => i.label === label);

describe('menu - Pracownicy', () => {
    it('właściciel: pierwsza pozycja sekcji „Firma", start na zakładce „Zespół"', () => {
        const sections = build({});
        const firma = sections.find(s => s.title === 'Firma')!;
        expect(firma.items[0].label).toBe('Pracownicy');
        expect(firma.items[0].path).toBe('/employees');
        expect(firma.items[0].match).toEqual(['/employees']);
    });

    it('kierownik zmiany (samo rozpatrywanie urlopów) trafia na wnioski, a nie na przekierowanie', () => {
        const pracownicy = item(build({ permissions: ['EMPLOYEES_LEAVES_APPROVE', 'VISITS_VIEW'] }), 'Pracownicy');
        expect(pracownicy?.path).toBe('/employees/leave-requests');
    });

    it('bez żadnego z uprawnień modułu pozycji nie ma', () => {
        expect(item(build({ permissions: ['VISITS_VIEW'] }), 'Pracownicy')).toBeUndefined();
    });

    it('licznik oczekujących wniosków stoi przy pozycji, a zero go chowa', () => {
        expect(item(build({ pendingLeaveRequests: 3 }), 'Pracownicy')?.badge).toBe(3);
        expect(item(build({ pendingLeaveRequests: 0 }), 'Pracownicy')?.badge).toBeUndefined();
    });
});

describe('menu - Urlop', () => {
    it('tylko konto z rekordem pracownika, w sekcji bez tytułu obok „Czasu pracy"', () => {
        expect(item(build({ permissions: [] }), 'Urlop')).toBeUndefined();

        const sections = build({ permissions: [], hasEmployeeRecord: true, trackWorkTime: true });
        const urlop = item(sections, 'Urlop');
        expect(urlop?.path).toBe('/me/leave');
        expect(urlop?.section).toBeUndefined();
        const top = sections[0].items.map(i => i.label);
        expect(top.indexOf('Urlop')).toBe(top.indexOf('Czas pracy') + 1);
    });
});
