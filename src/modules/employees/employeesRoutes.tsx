// src/modules/employees/employeesRoutes.tsx
//
// Zakładki modułu „Pracownicy" jako trasy-dzieci `/employees`. Rodzic (EmployeesView)
// renderuje nagłówek, pasek zakładek i `<Outlet />`, więc zmiana zakładki wymienia
// tylko treść - Layout, nagłówek i pasek zostają zamontowane.
//
// Każde dziecko pilnuje własnego uprawnienia (to samo co w employeesTabs.ts), a rodzic -
// tylko tego, że użytkownik widzi jakąkolwiek zakładkę (ANY_EMPLOYEES). Karta pracownika
// `/employees/:employeeId` jest osobną trasą: statyczne dzieci (`leave-requests`, `worktime`…)
// wygrywają z parametrem w rankingu React Routera.

import { Navigate, type RouteObject } from 'react-router-dom';
import { RequirePermission } from '@/core/permissions';
import { EMPLOYEES_TABS, type EmployeesTab } from './employeesTabs';
import { EmployeesIndexView, LeavesTabView, WorktimeTabView } from './views/EmployeesTabViews';

const requires = (key: EmployeesTab) => EMPLOYEES_TABS.find(t => t.key === key)!.requires;

export const employeesTabRoutes: RouteObject[] = [
    // Indeks sam rozstrzyga o uprawnieniu: bez EMPLOYEES_MANAGE przekierowuje na pierwszą
    // dostępną zakładkę, zamiast wyrzucać na stronę startową.
    { index: true, element: <EmployeesIndexView /> },
    {
        // Głęboki link z powiadomienia push: `?request={id}` otwiera okno wniosku.
        path: 'leave-requests',
        element: <RequirePermission anyOf={requires('leaves')}><LeavesTabView /></RequirePermission>,
    },
    {
        // Dawna zakładka „Nieobecności" - jej grafik stoi teraz pod wnioskami.
        path: 'absences',
        element: <Navigate to="/employees/leave-requests" replace />,
    },
    {
        path: 'worktime',
        element: <RequirePermission anyOf={requires('worktime')}><WorktimeTabView /></RequirePermission>,
    },
];
