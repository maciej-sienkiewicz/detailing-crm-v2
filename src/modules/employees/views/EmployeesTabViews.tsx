// src/modules/employees/views/EmployeesTabViews.tsx
//
// Treść zakładek, które potrzebują czegoś od ramy modułu (EmployeesView): listy
// miesięczne przechodzą do zespołu przez ramę. Wnioski i nieobecności niczego od ramy
// nie chcą - ich trasy renderują komponenty wprost.
//
// Zespół nie otwiera już okna „Lista obecności": lista powstaje w widoku miesiąca,
// z zatwierdzonych kart, a nie z dowolnie zaznaczonych osób.

import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/core/permissions';
import { TeamList } from '../components/team/TeamList';
import { MonthView } from '../components/worktime/MonthView';
import { firstEmployeesTabPath } from '../employeesTabs';
import { useEmployeesOutlet } from './employeesOutlet';

export function TeamTabView() {
    const navigate = useNavigate();
    return <TeamList onGoToRoles={() => navigate('/settings?tab=roles')} />;
}

export function WorktimeTabView() {
    const { can } = usePermissions();
    const { goToTab } = useEmployeesOutlet();
    return <MonthView onGoToTeam={can('EMPLOYEES_MANAGE') ? () => goToTab('team') : undefined} />;
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
