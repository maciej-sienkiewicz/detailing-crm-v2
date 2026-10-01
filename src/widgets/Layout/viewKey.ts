// src/widgets/Layout/viewKey.ts
//
// Klucz WIDOKU dla Layoutu: od niego zależą przebitka wejścia na widok (RouteFlash)
// i powrót przewinięcia na górę.
//
// Zwykle widok = ścieżka. Wyjątkiem są zakładki, które są osobnymi trasami jednego
// widoku (employeesTabs.ts: push i Tablica linkują wprost do zakładki). Kluczowane
// ścieżką odgrywały przebitkę na całej treści przy każdym przełączeniu zakładki:
// nagłówek „Pracownicy" i pasek zakładek gasły na 240 ms, choć nic się w nich nie
// zmieniało, i wyglądało to jak przeładowanie strony. Zakładki jednego widoku dzielą
// więc klucz, a zmienia się tylko treść pod paskiem.

import { EMPLOYEES_TABS } from '@/modules/employees/employeesTabs';

/** Grupy tras, które są zakładkami jednego widoku. Klucz grupy to jej pierwsza ścieżka. */
const TAB_ROUTE_GROUPS: readonly (readonly string[])[] = [
    EMPLOYEES_TABS.map(t => t.path),
];

export function viewKeyOf(pathname: string): string {
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const group = TAB_ROUTE_GROUPS.find(paths => paths.includes(normalized));
    return group ? group[0] : pathname;
}
