import { useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Search } from 'lucide-react';
import { Segmented, ui, type SegmentedOption } from '@/common/components/ui';
import { Container } from './rbacShared.styles';
import { TeamSection, TEAM_PAGE_SIZE } from './TeamSection';
import { RolesSection } from './RolesSection';
import { SettlementsSection } from './settlements/SettlementsSection';
import { AttendanceSheetModal } from './team/AttendanceSheetModal';
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
 * w oknie „Lista obecności" i ląduje tutaj, zamiast znikać w folderze Pobrane.
 */
export type TeamSubView = 'employees' | 'roles' | 'settlements';

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

    const [search, setSearch] = useState('');
    const [attendanceOpen, setAttendanceOpen] = useState(false);

    // Świeżo wygenerowana lista: „Rozliczenia" w przełączniku mrugają, a wiersz podświetla
    // się po wejściu - administrator widzi, dokąd lista trafiła, zamiast szukać pliku.
    const [settlementsFlash, setSettlementsFlash] = useState(0);
    const [newSheetId, setNewSheetId] = useState<string | null>(null);

    const handleSheetGenerated = (sheet: AttendanceSheet) => {
        setNewSheetId(sheet.id);
        setSettlementsFlash(n => n + 1);
    };

    // Wiersz podświetla się przy pierwszym obejrzeniu, nie przy każdym powrocie do widoku.
    useEffect(() => {
        if (subView !== 'settlements' || !newSheetId) return;
        const timer = setTimeout(() => setNewSheetId(null), 3000);
        return () => clearTimeout(timer);
    }, [subView, newSheetId]);

    // Licznik przy „Rozliczeniach" to listy do zatwierdzenia - widać je bez wchodzenia
    // w widok. Pusto, gdy nic nie czeka.
    const toApprove = pendingCount(sheets);

    const options: SegmentedOption<TeamSubView>[] = [
        { value: 'employees', label: 'Pracownicy', count: pagination?.totalItems ?? null },
        { value: 'roles', label: 'Role', count: roles.length },
        {
            value: 'settlements',
            label: (
                // Nowy klucz restartuje animację przy każdej kolejnej wygenerowanej liście.
                <FlashLabel key={settlementsFlash} $flash={settlementsFlash > 0} data-flash={settlementsFlash > 0 || undefined}>
                    Rozliczenia
                    {toApprove > 0 && <Waiting>{toApprove} do zatwierdzenia</Waiting>}
                </FlashLabel>
            ),
        },
    ];

    return (
        <Container>
            <Bar>
                <Segmented
                    label="Widok zespołu"
                    options={options}
                    value={subView}
                    onChange={onSubViewChange}
                />
                {subView === 'employees' && (
                    <SearchBox>
                        <Search aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Szukaj osoby"
                            aria-label="Szukaj osoby po imieniu, nazwisku lub e-mailu"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </SearchBox>
                )}
            </Bar>

            {subView === 'roles' ? (
                <RolesSection onGoToEmployees={() => onSubViewChange('employees')} />
            ) : subView === 'settlements' ? (
                <SettlementsSection
                    highlightId={newSheetId}
                    onGoToEmployees={() => onSubViewChange('employees')}
                    onCreateSheet={() => setAttendanceOpen(true)}
                />
            ) : (
                <TeamSection
                    search={search}
                    onGoToRoles={() => onSubViewChange('roles')}
                    onOpenAttendance={() => setAttendanceOpen(true)}
                />
            )}

            {attendanceOpen && (
                <AttendanceSheetModal
                    onClose={() => setAttendanceOpen(false)}
                    onGenerated={handleSheetGenerated}
                />
            )}
        </Container>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;

    /* Przełącznik z licznikiem „2 do zatwierdzenia" jest szerszy niż telefon -
       przewija się w poziomie, zamiast rozpychać stronę. */
    > [role='group'] { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
`;

const SearchBox = styled.label`
    flex: 1 1 220px;
    max-width: 320px;
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 12px;
    color: ${ui.textFaint};
    transition: border-color 150ms, box-shadow 150ms;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
    input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        color: ${ui.ink};
        &::placeholder { color: ${ui.textFaint}; }
    }
    &:focus-within { border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14); }

    @media (max-width: 767px) { max-width: none; margin-left: 0; flex-basis: 100%; }
`;

const flash = keyframes`
    0%, 100% { background: transparent; }
    30%, 70% { background: ${ui.okTintHover}; }
`;

const FlashLabel = styled.span<{ $flash: boolean }>`
    /* Segmented stylizuje każdy <span> jak licznik - etykieta wraca do tekstu przycisku. */
    && { font-size: inherit; font-weight: inherit; color: inherit; }
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: -3px -6px;
    padding: 3px 6px;
    border-radius: 6px;
    ${p => p.$flash && css`animation: ${flash} 1.2s ease-in-out 2;`}
`;

const Waiting = styled.span`
    && { font-size: 12px; font-weight: 700; color: ${ui.warnInk}; }
`;
