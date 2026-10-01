// src/modules/employees/views/EmployeesTabViews.tsx
//
// Treść zakładek, które potrzebują czegoś od ramy modułu (EmployeesView): zespół
// i listy miesięczne otwierają okno listy obecności, a listy podświetlają świeżo
// wygenerowany wiersz. Wnioski i nieobecności niczego od ramy nie chcą - ich trasy
// renderują komponenty wprost.

import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/core/permissions';
import { TeamList } from '../components/team/TeamList';
import { SettlementsSection } from '../components/worktime/SettlementsSection';
import { firstEmployeesTabPath } from '../employeesTabs';
import { useEmployeesOutlet } from './employeesOutlet';

export function TeamTabView() {
    const navigate = useNavigate();
    const { openAttendance } = useEmployeesOutlet();
    return <TeamList onGoToRoles={() => navigate('/settings?tab=roles')} onOpenAttendance={openAttendance} />;
}

export function WorktimeTabView() {
    const { can } = usePermissions();
    const { newSheetId, openAttendance, goToTab } = useEmployeesOutlet();
    return (
        <SettlementsSection
            highlightId={newSheetId}
            onGoToEmployees={can('EMPLOYEES_MANAGE') ? () => goToTab('team') : undefined}
            onCreateSheet={openAttendance}
        />
    );
}

/**
 * `/employees`: zespół dla kadrowych, a kierownik zmiany (bez EMPLOYEES_MANAGE) trafia
 * od razu na pierwszą zakładkę, do której ma prawo - rama z nagłówkiem zostaje, więc
 * przekierowanie nie mruga całą stroną.
 */
export function EmployeesIndexView() {
    const { can } = usePermissions();
    if (can('EMPLOYEES_MANAGE')) return <TeamTabView />;
    return <Navigate to={firstEmployeesTabPath(can) ?? '/'} replace />;
}
