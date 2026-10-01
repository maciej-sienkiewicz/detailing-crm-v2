// src/modules/employees/views/EmployeesView.tsx
//
// Moduł „Pracownicy": zespół, wnioski urlopowe (kolejka decyzji), grafik nieobecności
// i listy miesięczne (lista obecności i rozliczenia, dawny „Czas pracy").
//
// Stał w Ustawieniach (`/settings?tab=team`) jako jedna sekcja z trzema podwidokami.
// Zgłoszenie brzmiało „Pracownicy są za głęboko": lista ludzi to praca dzienna, a nie
// konfiguracja, a karta pracownika odsyłała strzałką z powrotem do Ustawień. Teraz
// to moduł w sekcji „Firma" panelu, a w Ustawieniach zostały tylko role i uprawnienia.
//
// Ten widok jest RAMĄ: nagłówek, pasek zakładek i `<Outlet />`. Zakładki są trasami-
// dziećmi `/employees` (employeesRoutes.tsx). Wcześniej każda zakładka była osobną trasą
// najwyższego poziomu z własnym `page(<EmployeesView tab=… />)`, więc zmiana zakładki
// montowała od nowa cały Layout - nagłówek mrugał („zmiana zakładki nie powinna
// odświeżać całego widoku, tylko samego contentu"). Teraz zmienia się tylko Outlet.
//
// Rama dostarcza PageChrome, więc lista zespołu i rozliczenia wstawiają akcje do
// nagłówka i pilnują niezapisanych zmian tak samo jak w Ustawieniach - komponenty
// nie wiedzą, w którym module stoją.

import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader } from '@/common/components/PageHeader';
import { PageChromeProvider } from '@/common/components/PageChrome';
import { TabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { usePermissions } from '@/core/permissions';
import { TEAM_PAGE_SIZE } from '../components/team/TeamList';
import { AttendanceSheetModal } from '../components/worktime/AttendanceSheetModal';
import { pendingCount } from '../components/worktime/settlementFormat';
import { useEmployees } from '../hooks/useEmployees';
import { useAttendanceSheets } from '../hooks/useAttendanceSheets';
import { useLeaveRequestQueue } from '../hooks/useLeaveRequests';
import type { AttendanceSheet } from '../api/attendanceApi';
import { EMPLOYEES_TABS, employeesTabFromPath, employeesTabPath, type EmployeesTab } from '../employeesTabs';
import type { EmployeesOutletContext } from './employeesOutlet';

export function EmployeesView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { can } = usePermissions();
    const tab = employeesTabFromPath(location.pathname);

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

    const [attendanceOpen, setAttendanceOpen] = useState(false);

    // Świeżo wygenerowana lista: „Listy miesięczne" w pasku mrugają, a wiersz podświetla
    // się po wejściu - administrator widzi, dokąd lista trafiła, zamiast szukać pliku.
    // Rama zostaje zamontowana między zakładkami, więc identyfikator żyje tutaj.
    const [worktimeFlash, setWorktimeFlash] = useState(0);
    const [newSheetId, setNewSheetId] = useState<string | null>(null);

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
        navigate(employeesTabPath(key));
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

    const outletContext: EmployeesOutletContext = {
        newSheetId,
        openAttendance: () => setAttendanceOpen(true),
        goToTab,
    };

    return (
        <PageChromeProvider headerActions={headerActions}>
            <Page>
                <PageHeader title="Pracownicy" subtitle="Zespół, urlopy i listy miesięczne" />

                <Toolbar>
                    <TabBar tabs={tabs} activeKey={tab} onChange={goToTab} ariaLabel="Zakładki modułu Pracownicy" />
                    <HeadActions ref={setHeaderActions} />
                </Toolbar>

                <Content>
                    <Outlet context={outletContext} />
                </Content>

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
