// src/widgets/Layout/viewKey.ts
//
// Klucz WIDOKU dla Layoutu: ten sam dla wszystkich zakładek jednego widoku.
//
// Layout przy wejściu na inny widok odgrywa przebitkę (RouteFlash: nakładka w kolorze
// tła, gaśnie w 240 ms) i przewija stronę na górę. Klucz był ścieżką, a zakładki
// „Pracowników" to osobne ścieżki (/employees/absences, /employees/worktime…), żeby
// push i Tablica mogły linkować wprost do zakładki. Każda zmiana zakładki odgrywała
// więc przebitkę na całej treści i nagłówek „mrugał", choć rama z nagłówkiem nie była
// przemontowywana (trasy-dzieci jednej ramy, employeesRoutes.tsx). Zakładka to nie
// nowy widok: zmienia się tylko treść pod paskiem, więc klucz zostaje ten sam.
//
// Karta pracownika (/employees/:id) i karta czasu pracy to osobne widoki - nie ma ich
// na liście zakładek, więc dalej dostają własny klucz i przebitkę.

import { EMPLOYEES_TABS } from '@/modules/employees/employeesTabs';

interface TabbedView {
    /** Klucz wspólny dla wszystkich zakładek widoku. */
    base: string;
    /** Ścieżki zakładek (bez końcowego ukośnika). */
    tabPaths: readonly string[];
}

const TABBED_VIEWS: readonly TabbedView[] = [
    { base: '/employees', tabPaths: EMPLOYEES_TABS.map(t => t.path) },
];

export function viewKeyOf(pathname: string): string {
    const path = pathname.replace(/\/+$/, '') || '/';
    return TABBED_VIEWS.find(v => v.tabPaths.includes(path))?.base ?? path;
}
