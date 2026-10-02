// src/modules/employees/components/employee-modal/LeavesPanel.tsx
//
// Zakładka „Urlopy" w oknie pracownika: ile dni urlopu w tym roku, wnioski czekające
// na decyzję i historia z rejestru urlopów, rok po roku.
//
// Bez zdań „Najbliższy: …" i „Czeka na Twoją decyzję: …" nad listą - właściciel je
// wyciął przy makiecie: to samo widać wierszem niżej.
//
// „Dodaj urlop" otwiera ten sam wniosek ON_BEHALF co zakładka „Wnioski urlopowe",
// z tą osobą już wybraną - z podpisem pracownika i decyzją, jak każdy urlop. Dawny
// formularz na karcie pracownika dopisywał wpis do rejestru z pominięciem podpisów.
// L4 (bez wniosku) wpisuje się pod grafikiem nieobecności, jak dotąd.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, IconButton, Notice, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { useDeleteLeave, useLeaves } from '../../hooks/useLeaves';
import { useLeaveRequestQueue } from '../../hooks/useLeaveRequests';
import { LEAVE_TYPE_LABELS } from '../../utils/leaveTypeLabels';
import { formatLeaveRange, leaveRequestTypeLabel, workingDaysLabel } from '../../utils/leaveRequestFormat';
import type { EmployeeLeave } from '../../types';
import { AddLeaveModal } from '../leave/AddLeaveModal';
import { LeaveDecisionModal } from '../leave/LeaveDecisionModal';

/** Rejestr liczy dni kalendarzowe (daysCount), wnioski - robocze. */
const calendarDaysLabel = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

export function LeavesPanel({ employeeId }: { employeeId: string }) {
    const { can } = usePermissions();
    const canApprove = can('EMPLOYEES_LEAVES_APPROVE');
    const { showSuccess } = useToast();
    const { leaves, isLoading, isError, refetch } = useLeaves(employeeId);
    const queue = useLeaveRequestQueue('PENDING', { enabled: canApprove });
    const deleteLeave = useDeleteLeave(employeeId);
    const [adding, setAdding] = useState(false);
    const [openRequest, setOpenRequest] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<EmployeeLeave | null>(null);

    const year = new Date().getFullYear();
    const pending = (queue.data?.items ?? []).filter(r => r.employeeId === employeeId);

    const daysThisYear = useMemo(
        () => leaves.filter(l => l.startDate.startsWith(String(year))).reduce((sum, l) => sum + l.daysCount, 0),
        [leaves, year],
    );

    // Lista przychodzi posortowana malejąco po dacie rozpoczęcia.
    const groups = useMemo(() => {
        const byYear = new Map<string, EmployeeLeave[]>();
        for (const l of leaves) {
            const y = l.startDate.slice(0, 4);
            byYear.set(y, [...(byYear.get(y) ?? []), l]);
        }
        return [...byYear.entries()];
    }, [leaves]);

    const handleDelete = () => {
        if (!pendingDelete) return;
        deleteLeave.mutate(pendingDelete.id, {
            onSuccess: () => showSuccess('Urlop usunięty'),
            // Odmowę (np. wpis z zatwierdzonego wniosku - zdejmuje go „Odwołaj urlop"
            // przy wniosku) pokazuje globalny dymek z komunikatem serwera.
            onSettled: () => setPendingDelete(null),
        });
    };

    if (isError) {
        return (
            <Notice
                tone="danger"
                title="Nie udało się wczytać urlopów"
                action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
            />
        );
    }

    return (
        <Stack>
            <Toolbar>
                <Total>
                    {isLoading ? '–' : daysThisYear}
                    <small> {daysThisYear === 1 ? 'dzień' : 'dni'} urlopu w {year}</small>
                </Total>
                {canApprove && (
                    <Button variant="outline" onClick={() => setAdding(true)}>
                        <Plus aria-hidden="true" /> Dodaj urlop
                    </Button>
                )}
            </Toolbar>

            {pending.length > 0 && (
                <Group>
                    <SectionTitle as="h3" count={pending.length}>Wnioski do decyzji</SectionTitle>
                    <List>
                        {pending.map(r => (
                            <li key={r.id}>
                                <RowButton type="button" onClick={() => setOpenRequest(r.id)}>
                                    <Main>
                                        <RowHead>
                                            <strong>{formatLeaveRange(r.startDate, r.endDate)}</strong>
                                            <StatusPill $tone="neutral">{leaveRequestTypeLabel(r.leaveType, r.onDemand)}</StatusPill>
                                        </RowHead>
                                        <Sub>{r.number}, podpisany przez pracownika</Sub>
                                    </Main>
                                    <Days>{workingDaysLabel(r.workingDays)}</Days>
                                    <StatusPill $tone="warn">Czeka na decyzję</StatusPill>
                                    <Chevron aria-hidden="true" />
                                </RowButton>
                            </li>
                        ))}
                    </List>
                </Group>
            )}

            {!isLoading && leaves.length === 0 && pending.length === 0 && (
                <Empty>
                    <strong>Brak urlopów</strong>
                    <span>Tu pojawią się zatwierdzone urlopy i zwolnienia wpisane przez kadry.</span>
                </Empty>
            )}

            {groups.map(([y, items]) => (
                <Group key={y}>
                    <SectionTitle as="h3" count={calendarDaysLabel(items.reduce((s, l) => s + l.daysCount, 0))}>{y}</SectionTitle>
                    <List>
                        {items.map(l => (
                            <li key={l.id}>
                                <Row>
                                    <Main>
                                        <RowHead>
                                            <strong>{formatLeaveRange(l.startDate, l.endDate)}</strong>
                                            <StatusPill $tone="neutral">{LEAVE_TYPE_LABELS[l.leaveType]}</StatusPill>
                                        </RowHead>
                                        {l.note && <Sub>{l.note}</Sub>}
                                    </Main>
                                    <Days>{calendarDaysLabel(l.daysCount)}</Days>
                                    <IconButton
                                        label={`Usuń urlop ${formatLeaveRange(l.startDate, l.endDate)}`}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPendingDelete(l)}
                                    >
                                        <Trash2 />
                                    </IconButton>
                                </Row>
                            </li>
                        ))}
                    </List>
                </Group>
            ))}

            {adding && <AddLeaveModal employeeId={employeeId} onClose={() => setAdding(false)} />}
            {openRequest && <LeaveDecisionModal key={openRequest} requestId={openRequest} onClose={() => setOpenRequest(null)} />}
            <ConfirmationModal
                isOpen={!!pendingDelete}
                title="Usunąć urlop?"
                message={pendingDelete
                    ? `${LEAVE_TYPE_LABELS[pendingDelete.leaveType]}, ${formatLeaveRange(pendingDelete.startDate, pendingDelete.endDate)} zniknie z rejestru i z grafiku nieobecności.`
                    : ''}
                variant="danger"
                confirmText="Usuń urlop"
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </Stack>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

const Toolbar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
`;

const Total = styled.p`
    margin: 0;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;

    small { font-size: 15px; font-weight: 600; letter-spacing: 0; color: ${ui.textMuted}; }
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    overflow: hidden;

    li + li { border-top: 1px solid ${ui.lineSoft}; }
`;

const rowLayout = `
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 6px 16px;
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    text-align: left;
    background: ${ui.surface};
`;

const Row = styled.div`
    ${rowLayout}
    padding-right: 8px;
`;

const RowButton = styled.button`
    ${rowLayout}
    grid-template-columns: minmax(0, 1fr) auto auto 16px;
    border: 0;
    font: inherit;
    cursor: pointer;

    &:hover { background: ${ui.surfaceSoft}; }

    /* Telefon: liczba dni znika (jest w treści wniosku), a status schodzi pod termin,
       żeby data nie łamała się na dwie linie. */
    @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr) 16px;
        > span:nth-child(2) { display: none; }
        > span:nth-child(3) { grid-column: 1; grid-row: 2; justify-self: start; }
        > svg { grid-column: 2; grid-row: 1 / span 2; }
    }
`;

const Main = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const RowHead = styled.span`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;

    strong { font-weight: 600; color: ${ui.ink}; font-variant-numeric: tabular-nums; white-space: nowrap; }
`;

const Sub = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const Days = styled.span`
    font-size: 13.5px;
    color: ${ui.inkSoft};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const Chevron = styled(ChevronRight)`
    width: 16px;
    height: 16px;
    color: ${ui.textFaint};
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 36px 16px;
    text-align: center;

    strong { font-size: 15px; color: ${ui.ink}; }
    span { font-size: 14px; color: ${ui.textMuted}; max-width: 44ch; line-height: 1.5; }
`;
