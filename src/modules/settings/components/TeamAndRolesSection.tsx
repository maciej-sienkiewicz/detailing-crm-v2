import { useEffect, useMemo, useState } from 'react';
import { TabBar, type TabDefinition } from '@/common/components/TabBar';
import { Container } from './rbacShared.styles';
import { TeamSection, TEAM_PAGE_SIZE } from './TeamSection';
import { RolesSection } from './RolesSection';
import { SettlementsSection } from './settlements/SettlementsSection';
import { pendingCount } from './settlements/settlementFormat';
import { useEmployees } from '../hooks/useTeam';
import { useRoles } from '../hooks/useRoles';
import { useAttendanceSheets } from '../hooks/useAttendanceSheets';
import type { AttendanceSheet } from '../api/attendanceApi';

/**
 * Employees and roles are one subject, not two.
 *
 * Splitting them across sibling tabs is what forced the "leave, create a role,
 * come back" detour: every question about a person ("what can they do?") and
 * every question about a role ("who uses it?") needs both lists. They now live
 * in one tab as two views, so cross-navigation is a segment click and the role
 * a person needs can be created without losing the form.
 *
 * Rozliczenia są trzecim widokiem tego samego tematu: lista obecności powstaje
 * z zaznaczonych pracowników i ląduje tutaj, zamiast znikać w folderze Pobrane.
 */
export type TeamSubView = 'employees' | 'roles' | 'settlements';

const UsersIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3M8 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M18 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const SettlementIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
    </svg>
);

interface TeamAndRolesSectionProps {
    subView: TeamSubView;
    onSubViewChange: (next: TeamSubView) => void;
}

export function TeamAndRolesSection({ subView, onSubViewChange }: TeamAndRolesSectionProps) {
    // Same filters TeamSection opens with, so this shares its cache entry rather
    // than firing a second request just to label the segment.
    const { pagination } = useEmployees({ search: '', page: 1, limit: TEAM_PAGE_SIZE });
    const { roles } = useRoles();
    const { sheets } = useAttendanceSheets();

    // Świeżo wygenerowana lista: zakładka Rozliczenia mruga, a jej wiersz podświetla się
    // po wejściu - administrator widzi, dokąd lista trafiła, zamiast szukać pliku.
    const [settlementsFlash, setSettlementsFlash] = useState(0);
    const [newSheetId, setNewSheetId] = useState<string | null>(null);

    const handleSheetGenerated = (sheet: AttendanceSheet) => {
        setNewSheetId(sheet.id);
        setSettlementsFlash(n => n + 1);
    };

    // Wiersz podświetla się przy pierwszym obejrzeniu, nie przy każdym powrocie do zakładki.
    useEffect(() => {
        if (subView !== 'settlements' || !newSheetId) return;
        const timer = setTimeout(() => setNewSheetId(null), 3000);
        return () => clearTimeout(timer);
    }, [subView, newSheetId]);

    const employeeCount = pagination?.totalItems;
    const roleCount = roles.length;
    // Licznik na zakładce to rozliczenia do zatwierdzenia - pusto, gdy nic nie czeka.
    const toApprove = pendingCount(sheets);

    const tabs = useMemo<TabDefinition<TeamSubView>[]>(() => ([
        { key: 'employees', label: 'Pracownicy', icon: <UsersIcon />, count: employeeCount },
        { key: 'roles', label: 'Role i uprawnienia', icon: <ShieldIcon />, count: roleCount },
        {
            key: 'settlements',
            label: 'Rozliczenia',
            icon: <SettlementIcon />,
            count: toApprove > 0 ? toApprove : undefined,
            flashKey: settlementsFlash,
        },
    ]), [employeeCount, roleCount, toApprove, settlementsFlash]);

    return (
        <Container>
            <TabBar
                tabs={tabs}
                activeKey={subView}
                onChange={onSubViewChange}
                ariaLabel="Widok zespołu"
            />

            {subView === 'roles' ? (
                <RolesSection onGoToEmployees={() => onSubViewChange('employees')} />
            ) : subView === 'settlements' ? (
                <SettlementsSection
                    highlightId={newSheetId}
                    onGoToEmployees={() => onSubViewChange('employees')}
                />
            ) : (
                <TeamSection
                    onGoToRoles={() => onSubViewChange('roles')}
                    onAttendanceSheetGenerated={handleSheetGenerated}
                />
            )}
        </Container>
    );
}
