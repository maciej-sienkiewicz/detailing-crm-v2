// src/modules/employees/views/EmployeesTabViews.tsx
//
// Treść zakładek, które potrzebują czegoś od ramy modułu (EmployeesView): listy
// miesięczne przechodzą do zespołu przez ramę. Zakładka wniosków składa dwie sekcje:
// kolejkę wniosków i pod nią grafik nieobecności.
//
// Listy obecności mają własną zakładkę: „Wygeneruj listę" otwiera okno z miesiącem
// i zaznaczeniem pracowników, a lista pod spodem pokazuje, co czeka na zatwierdzenie.

import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { usePermissions } from '@/core/permissions';
import { TeamList } from '../components/team/TeamList';
import { LeaveRequestsTab } from '../components/leave/LeaveRequestsTab';
import { AbsencesSection } from '../components/leave/AbsencesSection';
import { MonthView } from '../components/worktime/MonthView';
import { SettlementsSection } from '../components/worktime/SettlementsSection';
import { AttendanceSheetModal } from '../components/worktime/AttendanceSheetModal';
import { firstEmployeesTabPath } from '../employeesTabs';
import { useEmployeesOutlet } from './employeesOutlet';

export function TeamTabView() {
    const navigate = useNavigate();
    return <TeamList onGoToRoles={() => navigate('/settings?tab=roles')} />;
}

/**
 * „Wnioski urlopowe": kolejka decyzji, a pod nią grafik nieobecności. Grafik odpowiada
 * na pytanie, które pada zaraz po otwarciu wniosku - kto jeszcze nie przyjdzie w tych
 * dniach - więc stoi w tym samym miejscu, a nie na osobnej zakładce. Kolejkę widzi
 * tylko rozpatrujący; kadrowa rola bez tego prawa dostaje sam grafik.
 */
export function LeavesTabView() {
    const { can } = usePermissions();
    return (
        <LeavesStack>
            {can('EMPLOYEES_LEAVES_APPROVE') && <LeaveRequestsTab />}
            <AbsencesSection />
        </LeavesStack>
    );
}

const LeavesStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
`;

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

/**
 * „Listy obecności": przycisk „Wygeneruj listę" otwiera okno z miesiącem i zaznaczeniem
 * pracowników. Świeżo zapisana lista jest podświetlona, żeby było widać, gdzie wylądowała.
 */
export function AttendanceTabView() {
    const { goToTab } = useEmployeesOutlet();
    const [creating, setCreating] = useState(false);
    const [highlightId, setHighlightId] = useState<string | null>(null);
    return (
        <>
            <SettlementsSection
                highlightId={highlightId}
                onCreateSheet={() => setCreating(true)}
                onGoToEmployees={() => goToTab('team')}
            />
            {creating && (
                <AttendanceSheetModal
                    onClose={() => setCreating(false)}
                    onGenerated={sheet => setHighlightId(sheet.id)}
                />
            )}
        </>
    );
}

/**
 * Dawny adres strony karty czasu pracy (`/employees/worktime/:period/:userId`) - karta
 * jest znowu oknem nad listą „Czas pracy", otwieranym parametrem `?card=`.
 */
export function LegacyWorkTimeCardRedirect() {
    const { period = '', userId = '' } = useParams<{ period: string; userId: string }>();
    const params = new URLSearchParams({ period, card: userId });
    return <Navigate to={`/employees/worktime?${params}`} replace />;
}
