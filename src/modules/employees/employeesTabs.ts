// src/modules/employees/employeesTabs.ts
//
// Zakładki modułu „Pracownicy". Każda ma własną ścieżkę (jak /statistics
// i /statistics/costs), a nie `?tab=`: push i podpowiedź na Tablicy linkują wprost
// do zakładki, a uprawnienie pilnuje trasy, nie tylko przycisku. Ścieżki są dziećmi
// jednej trasy `/employees` (employeesRoutes.tsx) - rama z nagłówkiem zostaje
// zamontowana, zmienia się tylko treść zakładki.
//
// Jedna lista zasila trzy miejsca naraz - pasek zakładek, pozycję w panelu bocznym
// i trasy - więc kolejność i wymagania nie mogą się między nimi rozjechać.
//
// „Listy miesięczne" (dawniej „Czas pracy") zostały pod `/employees/worktime`:
// na tę ścieżkę linkuje podpowiedź WORKTIME_MISSING na Tablicy. Nazwę zmieniono, bo
// „Czas pracy" to też samoobsługowy moduł pracownika (/worktime) - dwie pozycje
// o tej samej nazwie prowadziły w dwa różne miejsca.

import { ANY_EMPLOYEES, type PermissionRequirement } from '@/core/permissions/catalog';

export type EmployeesTab = 'team' | 'leaves' | 'worktime';

export interface EmployeesTabDef {
    key: EmployeesTab;
    label: string;
    path: string;
    requires: PermissionRequirement;
}

export const EMPLOYEES_TABS: readonly EmployeesTabDef[] = [
    { key: 'team', label: 'Zespół', path: '/employees', requires: 'EMPLOYEES_MANAGE' },
    // Wnioski i grafik nieobecności na jednej zakładce: kolejkę widzi tylko rozpatrujący
    // (EMPLOYEES_LEAVES_APPROVE), grafik - każdy z ANY_EMPLOYEES. Stąd wymaganie zakładki
    // jest szersze niż kolejki; sekcje pilnują się same (LeavesTabView).
    { key: 'leaves', label: 'Wnioski urlopowe', path: '/employees/leave-requests', requires: ANY_EMPLOYEES },
    { key: 'worktime', label: 'Listy miesięczne', path: '/employees/worktime', requires: 'EMPLOYEES_MANAGE' },
];

export const employeesTabPath = (key: EmployeesTab): string =>
    EMPLOYEES_TABS.find(t => t.key === key)!.path;

/** Zakładka z adresu; `/employees` (indeks) to „Zespół". */
export function employeesTabFromPath(pathname: string): EmployeesTab {
    const path = pathname.replace(/\/+$/, '');
    return EMPLOYEES_TABS.find(t => t.path === path)?.key ?? 'team';
}

/**
 * Pierwsza zakładka, do której użytkownik ma dostęp. Z niej startuje pozycja
 * „Pracownicy" w panelu bocznym: kierownik zmiany bez EMPLOYEES_MANAGE trafiłby
 * inaczej na `/employees` i przekierowanie na stronę startową.
 */
export function firstEmployeesTabPath(can: (required: PermissionRequirement) => boolean): string | null {
    return EMPLOYEES_TABS.find(t => can(t.requires))?.path ?? null;
}
