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
    it('właściciel: pozycja w sekcji „Firma" po Finansach i Statystykach, start na zakładce „Zespół"', () => {
        const sections = build({});
        const firma = sections.find(s => s.title === 'Firma')!;
        expect(firma.items.map(i => i.label)).toEqual(['Finanse', 'Statystyki', 'Pracownicy', 'Produkty']);
        const pracownicy = firma.items[2];
        expect(pracownicy.path).toBe('/employees');
        expect(pracownicy.match).toEqual(['/employees']);
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

    it('licznik sumuje wnioski urlopowe i sprawy czasu pracy (karty do decyzji, listy do podpisu)', () => {
        expect(item(build({ pendingLeaveRequests: 2, pendingWorkTime: 3 }), 'Pracownicy')?.badge).toBe(5);
        expect(item(build({ pendingLeaveRequests: 0, pendingWorkTime: 4 }), 'Pracownicy')?.badge).toBe(4);
        expect(item(build({ pendingLeaveRequests: 0, pendingWorkTime: 0 }), 'Pracownicy')?.badge).toBeUndefined();
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

describe('menu - układ grup', () => {
    it('właściciel widzi grupy w ustalonej kolejności, a Ustawienia i zgłoszenie na końcu, bez przypinania', () => {
        const sections = build({ trackWorkTime: true, hasEmployeeRecord: true });
        expect(sections.map(s => [s.title ?? null, s.items.map(i => i.label)])).toEqual([
            [null, ['Tablica', 'Aktywność', 'Czas pracy', 'Urlop']],
            ['Praca', ['Wizyty', 'Kalendarz', 'Zlecenia zbiorcze']],
            ['Klienci', ['Zapytania', 'Klienci', 'Pojazdy', 'Galeria']],
            ['Marketing', ['Kampanie', 'Zaplanowane treści', 'Instagram']],
            ['Firma', ['Finanse', 'Statystyki', 'Pracownicy', 'Produkty']],
            [null, ['Ustawienia', 'Zgłoś problem']],
        ]);
        expect(sections.some(s => s.pinned)).toBe(false);
    });

    it('bez Tablicy pierwsza pozycja to Powiadomienia', () => {
        const sections = build({ permissions: ['VISITS_VIEW'] });
        expect(sections[0].items[0].label).toBe('Powiadomienia');
    });
});

describe('menu - Zapytania', () => {
    it('nowy lead: czerwona poświata i czerwony licznik leadów', () => {
        const zapytania = item(build({ newLeadsCount: 2, unreadMailCount: 5 }), 'Zapytania');
        expect(zapytania?.badge).toBe(2);
        expect(zapytania?.alert).toBe(true);
        expect(zapytania?.badgeTone).toBeUndefined();
    });

    it('sama nieprzeczytana poczta: biały licznik wiadomości, bez poświaty', () => {
        const zapytania = item(build({ newLeadsCount: 0, unreadMailCount: 5 }), 'Zapytania');
        expect(zapytania?.badge).toBe(5);
        expect(zapytania?.alert).toBe(false);
        expect(zapytania?.badgeTone).toBe('neutral');
    });

    it('nic nowego: bez licznika i bez poświaty', () => {
        const zapytania = item(build({}), 'Zapytania');
        expect(zapytania?.badge).toBeUndefined();
        expect(zapytania?.alert).toBe(false);
    });
});
