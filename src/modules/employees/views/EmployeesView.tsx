// src/modules/employees/views/EmployeesView.tsx
//
// Moduł „Pracownicy": zespół, wnioski urlopowe (kolejka decyzji), grafik nieobecności
// i czas pracy (dawne „Rozliczenia").
//
// Stał w Ustawieniach (`/settings?tab=team`) jako jedna sekcja z trzema podwidokami.
// Zgłoszenie brzmiało „Pracownicy są za głęboko": lista ludzi to praca dzienna, a nie
// konfiguracja, a karta pracownika odsyłała strzałką z powrotem do Ustawień. Teraz
// to moduł w sekcji „Firma" panelu, a w Ustawieniach zostały tylko role i uprawnienia.
//
// Zakładki są trasami (employeesTabs.ts). Rama dostarcza PageChrome, więc lista
// zespołu i rozliczenia wstawiają akcje do nagłówka i pilnują niezapisanych zmian
// tak samo jak w Ustawieniach - komponenty nie wiedzą, w którym module stoją.

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader } from '@/common/components/PageHeader';
import { PageChromeProvider } from '@/common/components/PageChrome';
import { TabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { TeamList, TEAM_PAGE_SIZE } from '../components/team/TeamList';
import { SettlementsSection } from '../components/worktime/SettlementsSection';
import { AttendanceSheetModal } from '../components/worktime/AttendanceSheetModal';
import { pendingCount } from '../components/worktime/settlementFormat';
import { useEmployees } from '../hooks/useEmployees';
import { useAttendanceSheets } from '../hooks/useAttendanceSheets';
import { useLeaveRequestQueue } from '../hooks/useLeaveRequests';
import { LeaveRequestsTab } from '../components/leave/LeaveRequestsTab';
import { AbsencesTab } from '../components/leave/AbsencesTab';
import type { AttendanceSheet } from '../api/attendanceApi';
import { EMPLOYEES_TABS, employeesTabPath, type EmployeesTab } from '../employeesTabs';

/** Stan przejścia do „Czasu pracy" tuż po wygenerowaniu listy: ten wiersz mruga. */
interface WorktimeNavState {
    highlightSheetId?: string;
}

interface EmployeesViewProps {
    tab: EmployeesTab;
}

export function EmployeesView({ tab }: EmployeesViewProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { can } = usePermissions();

    const visibleTabs = useMemo(() => EMPLOYEES_TABS.filter(t => can(t.requires)), [can]);
    const canManage = can('EMPLOYEES_MANAGE');
    const canApprove = can('EMPLOYEES_LEAVES_APPROVE');

    // Te same filtry, od których startuje lista zespołu: licznik przy zakładce czyta
    // ten sam wpis cache, zamiast wysyłać drugie żądanie.
    const { pagination } = useEmployees({ search: '', page: 1, limit: TEAM_PAGE_SIZE }, { enabled: canManage });
    const { sheets } = useAttendanceSheets({ enabled: canManage });
    const toApprove = pendingCount(sheets);
    // Wszystkie oczekujące wnioski w studiu - ten sam wpis cache co domyślny widok kolejki.
    const leaveQueue = useLeaveRequestQueue('PENDING', { enabled: canApprove });
    const pendingLeaves = leaveQueue.data?.pendingCount ?? 0;

    const [search, setSearch] = useState('');
    const [attendanceOpen, setAttendanceOpen] = useState(false);

    // Świeżo wygenerowana lista: „Czas pracy" w pasku mruga, a wiersz podświetla się
    // po wejściu - administrator widzi, dokąd lista trafiła, zamiast szukać pliku.
    // Zakładki są trasami, więc identyfikator jedzie też w stanie nawigacji.
    const [worktimeFlash, setWorktimeFlash] = useState(0);
    const [newSheetId, setNewSheetId] = useState<string | null>(
        () => (location.state as WorktimeNavState | null)?.highlightSheetId ?? null,
    );

    const handleSheetGenerated = (sheet: AttendanceSheet) => {
        setNewSheetId(sheet.id);
        setWorktimeFlash(n => n + 1);
    };

    // Wiersz podświetla się przy pierwszym obejrzeniu, nie przy każdym powrocie.
    useEffect(() => {
        if (tab !== 'worktime' || !newSheetId) return;
        const timer = setTimeout(() => setNewSheetId(null), 3000);
        return () => clearTimeout(timer);
    }, [tab, newSheetId]);

    const goToTab = (key: EmployeesTab) => {
        if (key === tab) return;
        const state: WorktimeNavState | undefined =
            key === 'worktime' && newSheetId ? { highlightSheetId: newSheetId } : undefined;
        navigate(employeesTabPath(key), { state });
    };

    const tabs: TabDefinition<EmployeesTab>[] = visibleTabs.map(t => {
        if (t.key === 'team') return { key: t.key, label: t.label, count: pagination?.totalItems };
        if (t.key === 'leaves') return { key: t.key, label: t.label, count: pendingLeaves > 0 ? pendingLeaves : undefined };
        if (t.key === 'worktime') {
            // Licznik to listy do zatwierdzenia - pusto, gdy nic nie czeka.
            return { key: t.key, label: t.label, count: toApprove > 0 ? toApprove : undefined, flashKey: worktimeFlash };
        }
        return { key: t.key, label: t.label };
    });

    const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null);

    let content;
    if (tab === 'leaves') {
        content = <LeaveRequestsTab />;
    } else if (tab === 'absences') {
        content = <AbsencesTab />;
    } else if (tab === 'worktime') {
        content = (
            <SettlementsSection
                highlightId={newSheetId}
                onGoToEmployees={canManage ? () => goToTab('team') : undefined}
                onCreateSheet={() => setAttendanceOpen(true)}
            />
        );
    } else {
        content = (
            <>
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
                <TeamList
                    search={search}
                    onGoToRoles={() => navigate('/settings?tab=roles')}
                    onOpenAttendance={() => setAttendanceOpen(true)}
                />
            </>
        );
    }

    return (
        <PageChromeProvider headerActions={headerActions}>
            <Page>
                <PageHeader title="Pracownicy" subtitle="Zespół, urlopy i czas pracy" />

                <Toolbar>
                    <TabBar tabs={tabs} activeKey={tab} onChange={goToTab} ariaLabel="Zakładki modułu Pracownicy" />
                    <HeadActions ref={setHeaderActions} />
                </Toolbar>

                <Content>{content}</Content>

                {attendanceOpen && (
                    <AttendanceSheetModal
                        onClose={() => setAttendanceOpen(false)}
                        onGenerated={handleSheetGenerated}
                    />
                )}
            </Page>
        </PageChromeProvider>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Page = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    padding-block: 24px 120px;

    @media (max-width: 767px) { gap: 14px; padding-block: 12px 160px; }
`;

const Toolbar = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;

    /* TabBar bierze całą szerokość, akcje zakładki stoją po prawej. */
    > nav { flex: 1 1 320px; min-width: 0; }
`;

const HeadActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 6px;

    &:empty { display: none; }
    @media (max-width: 767px) { width: 100%; > * { flex: 1 1 auto; } }
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const SearchBox = styled.label`
    align-self: flex-end;
    width: min(320px, 100%);
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
        font-size: 16px;
        color: ${ui.ink};
        &::placeholder { color: ${ui.textFaint}; }
    }
    @media (min-width: 768px) { input { font-size: 14px; } }
    &:focus-within { border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14); }

    @media (max-width: 767px) { width: 100%; }
`;
