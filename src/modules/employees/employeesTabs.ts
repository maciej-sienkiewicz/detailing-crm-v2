// src/modules/employees/employeesTabs.ts
//
// Zakładki modułu „Pracownicy". Każda ma własną ścieżkę (jak /statistics
// i /statistics/costs), a nie `?tab=`: push i podpowiedź na Tablicy linkują wprost
// do zakładki, a uprawnienie pilnuje trasy, nie tylko przycisku.
//
// Jedna lista zasila trzy miejsca naraz - pasek zakładek, pozycję w panelu bocznym
// i trasy - więc kolejność i wymagania nie mogą się między nimi rozjechać.

import type { PermissionRequirement } from '@/core/permissions/catalog';

export type EmployeesTab = 'team' | 'worktime';

export interface EmployeesTabDef {
    key: EmployeesTab;
    label: string;
    path: string;
    requires: PermissionRequirement;
}

export const EMPLOYEES_TABS: readonly EmployeesTabDef[] = [
    { key: 'team', label: 'Zespół', path: '/employees', requires: 'EMPLOYEES_MANAGE' },
    { key: 'worktime', label: 'Czas pracy', path: '/employees/worktime', requires: 'EMPLOYEES_MANAGE' },
];

export const employeesTabPath = (key: EmployeesTab): string =>
    EMPLOYEES_TABS.find(t => t.key === key)!.path;

/**
 * Pierwsza zakładka, do której użytkownik ma dostęp. Z niej startuje pozycja
 * „Pracownicy" w panelu bocznym: kierownik zmiany bez EMPLOYEES_MANAGE trafiłby
 * inaczej na `/employees` i przekierowanie na stronę startową.
 */
export function firstEmployeesTabPath(can: (required: PermissionRequirement) => boolean): string | null {
    return EMPLOYEES_TABS.find(t => can(t.requires))?.path ?? null;
}
