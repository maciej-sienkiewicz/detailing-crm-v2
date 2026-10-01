// src/modules/employees/views/employeesOutlet.ts
//
// Co rama modułu (EmployeesView) daje zakładkom przez `<Outlet context>`. Stan, który
// ma przeżyć zmianę zakładki, żyje w ramie - zakładki montują się i odmontowują przy
// każdej zmianie.

import { useOutletContext } from 'react-router-dom';
import type { EmployeesTab } from '../employeesTabs';

export interface EmployeesOutletContext {
    goToTab: (key: EmployeesTab) => void;
}

export const useEmployeesOutlet = () => useOutletContext<EmployeesOutletContext>();
