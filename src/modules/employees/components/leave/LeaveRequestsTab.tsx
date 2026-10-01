// src/modules/employees/components/leave/LeaveRequestsTab.tsx
//
// Zakładka „Wnioski urlopowe": kolejka decyzji. Oczekujące są domyślnym widokiem, bo
// po to się tu przychodzi (push, podpowiedź na Tablicy, licznik przy „Pracownicy").
// `?request={id}` otwiera okno wniosku - tak linkuje powiadomienie push.
//
// Administrator (EMPLOYEES_MANAGE) dodaje tu także urlop bez wniosku - „Dodaj urlop"
// w nagłówku wpisuje go wprost do grafiku (AddLeaveModal).
//
// Wiersz jest chudy: osoba, rodzaj, termin, dni, data złożenia. Kolizje z innymi
// nieobecnościami lista nie zna - okno wniosku pokazuje je z pełnymi danymi, zamiast
// dociągać szczegóły każdego wiersza.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronRight, Inbox, Plus } from 'lucide-react';
import { EmptyState } from '@/common/components/EmptyState';
import { Button, Card, Notice, Segmented, StatusPill, ui, type SegmentedOption } from '@/common/components/ui';
import { formatDateTime } from '@/common/utils';
import { PageHeaderActions } from '@/common/components/PageChrome';
import { usePermissions } from '@/core/permissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useLeaveCalendar } from '../../hooks/useLeaves';
import { useLeaveRequestQueue } from '../../hooks/useLeaveRequests';
import type { LeaveRequestQueueStatus } from '../../types';
import {
    LEAVE_REQUEST_STATUS, addDaysIso, formatLeaveRange, leaveRequestTypeLabel, todayIso, workingDaysLabel,
} from '../../utils/leaveRequestFormat';
import { LeaveRequestModal } from './LeaveRequestModal';
import { AddLeaveModal } from './AddLeaveModal';

/** Głęboki link z powiadomienia push: `/employees/leave-requests?request={id}`. */
const REQUEST_PARAM = 'request';

/** Ile dni do przodu pokazujemy „najbliższe nieobecności" przy pustej kolejce. */
const UPCOMING_DAYS = 14;

export function LeaveRequestsTab() {
    const { can } = usePermissions();
    // Wpis do rejestru urlopów to uprawnienie kadrowe - samo rozpatrywanie wniosków go nie daje.
    const canManage = can('EMPLOYEES_MANAGE');
    const [addOpen, setAddOpen] = useState(false);
    const { employees } = useEmployees({ search: '', page: 1, limit: 100 }, { enabled: canManage });
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState<LeaveRequestQueueStatus>('PENDING');
    const queue = useLeaveRequestQueue(status);
    // Licznik przy „Oczekujących" stoi też w innych widokach. Kolejka oczekujących jest
    // i tak domyślnym widokiem, więc to ten sam wpis cache, a nie drugie żądanie.
    const pendingQueue = useLeaveRequestQueue('PENDING');
    const pendingCount = pendingQueue.data?.pendingCount ?? queue.data?.pendingCount ?? null;

    const openId = searchParams.get(REQUEST_PARAM);
    const openRequest = (id: string) => setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set(REQUEST_PARAM, id);
        return next;
    });
    const closeRequest = () => setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete(REQUEST_PARAM);
        return next;
    }, { replace: true });

    const options: SegmentedOption<LeaveRequestQueueStatus>[] = [
        { value: 'PENDING', label: 'Oczekujące', count: pendingCount },
        { value: 'DECIDED', label: 'Rozpatrzone' },
        { value: 'ALL', label: 'Wszystkie' },
    ];

    const items = queue.data?.items ?? [];

    return (
        <Wrap>
            {canManage && (
                <PageHeaderActions>
                    <Button variant="primary" size="lg" onClick={() => setAddOpen(true)}>
                        <Plus aria-hidden="true" />Dodaj urlop
                    </Button>
                </PageHeaderActions>
            )}
            <Bar>
                <Segmented label="Które wnioski" options={options} value={status} onChange={setStatus} />
            </Bar>

            {queue.isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać wniosków"
                    action={<Button variant="ghost" size="sm" onClick={() => queue.refetch()}>Spróbuj ponownie</Button>}
                />
            ) : queue.isLoading ? (
                <Muted>Wczytuję wnioski…</Muted>
            ) : items.length === 0 ? (
                status === 'PENDING' ? <EmptyQueue /> : (
                    <EmptyState icon={<Inbox />} title="Nie ma tu jeszcze wniosków" />
                )
            ) : (
                <ListCard>
                    <ul>
                        {items.map(r => {
                            const pill = LEAVE_REQUEST_STATUS[r.status];
                            return (
                                <Row key={r.id}>
                                    <RowButton
                                        type="button"
                                        onClick={() => openRequest(r.id)}
                                        aria-label={`Otwórz wniosek: ${r.employeeName}, ${formatLeaveRange(r.startDate, r.endDate)}`}
                                    >
                                        <Who>
                                            <strong>{r.employeeName}</strong>
                                            <span>{leaveRequestTypeLabel(r.leaveType, r.onDemand)}</span>
                                        </Who>
                                        <When>
                                            <strong>{formatLeaveRange(r.startDate, r.endDate)}</strong>
                                            <span>{workingDaysLabel(r.workingDays)}</span>
                                        </When>
                                        <Submitted>złożony {formatDateTime(r.employeeSignedAt ?? r.createdAt)}</Submitted>
                                        {status !== 'PENDING' && <StatusPill $tone={pill.tone}>{pill.label}</StatusPill>}
                                        <ChevronRight className="chev" aria-hidden="true" />
                                    </RowButton>
                                </Row>
                            );
                        })}
                    </ul>
                </ListCard>
            )}

            {openId && <LeaveRequestModal key={openId} requestId={openId} onClose={closeRequest} />}
            {addOpen && <AddLeaveModal employees={employees} onClose={() => setAddOpen(false)} />}
        </Wrap>
    );
}

/**
 * Pusta kolejka to dobra wiadomość - a kolejne pytanie menedżera brzmi „to kto
 * w najbliższych dniach nie przyjdzie?". Odpowiedź z kalendarza urlopów.
 */
function EmptyQueue() {
    const from = todayIso();
    const to = addDaysIso(from, UPCOMING_DAYS - 1);
    const { leaveDayMap } = useLeaveCalendar(from, to);

    const upcoming = useMemo(() => {
        const byPerson = new Map<string, { name: string; first: string; last: string }>();
        [...leaveDayMap.values()]
            .sort((a, b) => a.date.localeCompare(b.date))
            .forEach(day => day.employees.forEach(e => {
                const entry = byPerson.get(e.id);
                if (entry) entry.last = day.date;
                else byPerson.set(e.id, { name: e.fullName, first: day.date, last: day.date });
            }));
        return [...byPerson.values()];
    }, [leaveDayMap]);

    return (
        <EmptyState icon={<Inbox />} title="Nie ma wniosków do rozpatrzenia" description="Nowy wniosek pojawi się tutaj i w powiadomieniu.">
            {upcoming.length > 0 && (
                <Upcoming>
                    <strong>Najbliższe nieobecności</strong>
                    <ul>
                        {upcoming.map(u => (
                            <li key={`${u.name}-${u.first}`}>
                                <span>{u.name}</span>
                                <span>{formatLeaveRange(u.first, u.last)}</span>
                            </li>
                        ))}
                    </ul>
                </Upcoming>
            )}
        </EmptyState>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
`;

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    > [role='group'] { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const ListCard = styled(Card)`
    container-type: inline-size;
    container-name: leave-queue;
    overflow: hidden;

    ul { list-style: none; margin: 0; padding: 0; }
`;

const Row = styled.li`
    border-bottom: 1px solid ${ui.lineFaint};
    &:last-child { border-bottom: none; }
`;

const RowButton = styled.button`
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto auto 18px;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
    .chev { width: 16px; height: 16px; color: ${ui.textFaint}; }

    /* Wąska lista: osoba i termin jeden pod drugim, data złożenia pod spodem. */
    @container leave-queue (max-width: 620px) {
        grid-template-columns: minmax(0, 1fr) auto 18px;
        gap: 6px 12px;
        padding: 12px 14px;
    }
`;

const Who = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 13px; color: ${ui.textSecondary}; }
`;

const When = styled(Who)`
    strong { font-size: 14px; font-weight: 600; }

    @container leave-queue (max-width: 620px) { grid-column: 1; }
`;

const Submitted = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    white-space: nowrap;

    @container leave-queue (max-width: 620px) { grid-column: 1; }
`;

const Upcoming = styled.div`
    margin: 16px auto 0;
    max-width: 360px;
    text-align: left;

    strong { display: block; margin-bottom: 6px; font-size: 13.5px; color: ${ui.ink}; }
    ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: ${ui.inkSoft}; }
`;
