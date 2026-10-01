// src/modules/employees/views/employeesOutlet.ts
//
// Co rama modułu (EmployeesView) daje zakładkom przez `<Outlet context>`. Stan, który
// ma przeżyć zmianę zakładki (świeżo wygenerowana lista, okno listy obecności), żyje
// w ramie - zakładki montują się i odmontowują przy każdej zmianie.

import { useOutletContext } from 'react-router-dom';
import type { EmployeesTab } from '../employeesTabs';

export interface EmployeesOutletContext {
    /** Świeżo wygenerowana lista obecności - jej wiersz raz się podświetla. */
    newSheetId: string | null;
    /** Okno „Lista obecności" - to samo z zespołu i z list miesięcznych. */
    openAttendance: () => void;
    goToTab: (key: EmployeesTab) => void;
}

export const useEmployeesOutlet = () => useOutletContext<EmployeesOutletContext>();
