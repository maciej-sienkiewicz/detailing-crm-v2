// src/modules/employees/utils/leaveTypeLabels.ts
//
// Nazwy rodzajów urlopu - wspólne dla karty pracownika, wniosków i kalendarza.
// Mieszkały w LeavesTab.tsx, przez co plik komponentu eksportował też stałą (a Fast
// Refresh przeładowuje wtedy cały moduł zamiast komponentu).

import type { LeaveType } from '../types';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    ANNUAL: 'Urlop wypoczynkowy',
    SICK: 'Zwolnienie lekarskie',
    UNPAID: 'Urlop bezpłatny',
    SPECIAL: 'Urlop okolicznościowy',
    PARENTAL: 'Urlop rodzicielski',
    CARE: 'Opieka nad dzieckiem',
};
