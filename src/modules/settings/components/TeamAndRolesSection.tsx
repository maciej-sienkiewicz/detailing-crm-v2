import { useMemo } from 'react';
import styled from 'styled-components';
import { Container, Segmented, SegmentedBtn, SegmentedCount } from './rbacShared.styles';
import { TeamSection, TEAM_PAGE_SIZE } from './TeamSection';
import { RolesSection } from './RolesSection';
import { useEmployees } from '../hooks/useTeam';
import { useRoles } from '../hooks/useRoles';

/**
 * Employees and roles are one subject, not two.
 *
 * Splitting them across sibling tabs is what forced the "leave, create a role,
 * come back" detour: every question about a person ("what can they do?") and
 * every question about a role ("who uses it?") needs both lists. They now live
 * in one tab as two views, so cross-navigation is a segment click and the role
 * a person needs can be created without losing the form.
 */
export type TeamSubView = 'employees' | 'roles';

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

interface TeamAndRolesSectionProps {
    subView: TeamSubView;
    onSubViewChange: (next: TeamSubView) => void;
}

export function TeamAndRolesSection({ subView, onSubViewChange }: TeamAndRolesSectionProps) {
    // Same filters TeamSection opens with, so this shares its cache entry rather
    // than firing a second request just to label the segment.
    const { pagination } = useEmployees({ search: '', page: 1, limit: TEAM_PAGE_SIZE });
    const { roles } = useRoles();

    const employeeCount = pagination?.totalItems;
    const roleCount = roles.length;

    const segments = useMemo(() => ([
        { id: 'employees' as const, label: 'Pracownicy', icon: <UsersIcon />, count: employeeCount },
        { id: 'roles' as const, label: 'Role i uprawnienia', icon: <ShieldIcon />, count: roleCount },
    ]), [employeeCount, roleCount]);

    return (
        <Container>
            <SubNav>
                <Segmented role="tablist" aria-label="Widok zespołu">
                    {segments.map(seg => {
                        const active = subView === seg.id;
                        return (
                            <SegmentedBtn
                                key={seg.id}
                                role="tab"
                                aria-selected={active}
                                $active={active}
                                onClick={() => onSubViewChange(seg.id)}
                            >
                                {seg.icon}
                                {seg.label}
                                {seg.count !== undefined && (
                                    <SegmentedCount $active={active}>{seg.count}</SegmentedCount>
                                )}
                            </SegmentedBtn>
                        );
                    })}
                </Segmented>
            </SubNav>

            {subView === 'roles'
                ? <RolesSection onGoToEmployees={() => onSubViewChange('employees')} />
                : <TeamSection onGoToRoles={() => onSubViewChange('roles')} />}
        </Container>
    );
}

const SubNav = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;
