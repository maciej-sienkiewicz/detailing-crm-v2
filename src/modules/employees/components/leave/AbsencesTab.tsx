// src/modules/employees/components/leave/AbsencesTab.tsx
//
// Zakładka „Nieobecności": osoby × dni miesiąca. Odpowiada na pytanie, które właściciel
// zadaje najczęściej - „kto jutro jest w pracy?" - z danych, które już są (rejestr
// urlopów i L4), bez domeny zmian i obsady, której system jeszcze nie ma.
//
// Pełna komórka = nieobecność pewna (urlop zatwierdzony, L4). Kreskowana = wniosek
// oczekujący, czyli nieobecność jeszcze niepewna - widzi ją tylko ten, kto rozpatruje.
// Na telefonie przewija się w bok sama siatka, a nie cała strona.

import { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeaderActions } from '@/common/components/PageChrome';
import { Button, IconButton, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useLeaveCalendar } from '../../hooks/useLeaves';
import { useLeaveRequestQueue } from '../../hooks/useLeaveRequests';
import { getPolishHolidays, isWeekend } from '../../utils/polishHolidays';
import { todayIso } from '../../utils/leaveRequestFormat';
import { AddSickLeaveModal } from './AddSickLeaveModal';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Wszystkie dni miesiąca `YYYY-MM` jako YYYY-MM-DD. */
function monthDays(month: string): string[] {
    const [y, m] = month.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${month}-${pad(i + 1)}`);
}

const shiftMonth = (month: string, delta: number): string => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

type CellState = 'absent' | 'pending' | null;

interface PersonRow {
    id: string;
    name: string;
    days: Map<string, CellState>;
}

export function AbsencesTab() {
    const { can } = usePermissions();
    const canApprove = can('EMPLOYEES_LEAVES_APPROVE');
    const canManage = can('EMPLOYEES_MANAGE');

    const [month, setMonth] = useState(() => todayIso().slice(0, 7));
    const [sickOpen, setSickOpen] = useState(false);
    const days = useMemo(() => monthDays(month), [month]);
    const from = days[0];
    const to = days[days.length - 1];
    const today = todayIso();

    const holidays = useMemo(() => getPolishHolidays(Number(month.slice(0, 4))), [month]);
    const { leaveDayMap, isLoading } = useLeaveCalendar(from, to);
    const { employees } = useEmployees({ search: '', page: 1, limit: 100 });
    const pending = useLeaveRequestQueue('PENDING', { enabled: canApprove });

    const rows = useMemo<PersonRow[]>(() => {
        const byId = new Map<string, PersonRow>();
        const row = (id: string, name: string) => {
            let r = byId.get(id);
            if (!r) { r = { id, name, days: new Map() }; byId.set(id, r); }
            return r;
        };
        // Najpierw cały zespół (także obecni), potem każdy, kto pojawia się w danych -
        // lista osób bywa niedostępna dla kogoś, kto tylko rozpatruje urlopy.
        employees.forEach(e => row(e.id, e.fullName));
        leaveDayMap.forEach(day => day.employees.forEach(e => row(e.id, e.fullName).days.set(day.date, 'absent')));
        (pending.data?.items ?? []).forEach(req => {
            if (req.endDate < from || req.startDate > to) return;
            const r = row(req.employeeId, req.employeeName);
            days.forEach(d => {
                if (d >= req.startDate && d <= req.endDate && !r.days.get(d)) r.days.set(d, 'pending');
            });
        });
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    }, [employees, leaveDayMap, pending.data, days, from, to]);

    const anyAbsence = rows.some(r => r.days.size > 0);
    const [y, m] = month.split('-').map(Number);

    return (
        <Wrap>
            {canManage && (
                <PageHeaderActions>
                    <Button variant="primary" size="lg" onClick={() => setSickOpen(true)}>
                        <Plus aria-hidden="true" />Dodaj nieobecność (L4)
                    </Button>
                </PageHeaderActions>
            )}

            <MonthBar>
                <IconButton label="Poprzedni miesiąc" variant="ghost" onClick={() => setMonth(p => shiftMonth(p, -1))}>
                    <ChevronLeft />
                </IconButton>
                <MonthLabel aria-live="polite">{MONTHS[m - 1]} {y}</MonthLabel>
                <IconButton label="Następny miesiąc" variant="ghost" onClick={() => setMonth(p => shiftMonth(p, 1))}>
                    <ChevronRight />
                </IconButton>
                <Legend>
                    <span><Swatch $state="absent" aria-hidden="true" />nieobecność</span>
                    {canApprove && <span><Swatch $state="pending" aria-hidden="true" />wniosek oczekuje</span>}
                </Legend>
            </MonthBar>

            <GridScroll tabIndex={0} aria-label={`Grafik nieobecności, ${MONTHS[m - 1].toLowerCase()} ${y}`}>
                <Grid role="table" style={{ gridTemplateColumns: `minmax(140px, 180px) repeat(${days.length}, minmax(28px, 1fr))` }}>
                    <RowGroup role="row">
                    <HeadCell role="columnheader" $sticky>Osoba</HeadCell>
                    {days.map(d => {
                        const off = isWeekend(d) || holidays.has(d);
                        const dow = new Date(`${d}T00:00:00`).getDay();
                        return (
                            <HeadCell key={d} role="columnheader" $off={off} $today={d === today} title={holidays.has(d) ? 'Święto' : undefined}>
                                <b>{Number(d.slice(8))}</b>
                                <small>{WEEKDAYS[dow]}</small>
                            </HeadCell>
                        );
                    })}
                    </RowGroup>

                    {rows.map(r => (
                        <RowGroup key={r.id} role="row">
                            <NameCell role="rowheader" $sticky>{r.name}</NameCell>
                            {days.map(d => {
                                const state = r.days.get(d) ?? null;
                                const off = isWeekend(d) || holidays.has(d);
                                return (
                                    <DayCell
                                        key={d}
                                        role="cell"
                                        $off={off}
                                        $state={state}
                                        aria-label={state ? `${r.name}, ${d}: ${state === 'pending' ? 'wniosek oczekuje' : 'nieobecność'}` : undefined}
                                    />
                                );
                            })}
                        </RowGroup>
                    ))}
                </Grid>
                {!isLoading && !anyAbsence && <Empty>W tym miesiącu nikt nie ma zaplanowanej nieobecności.</Empty>}
            </GridScroll>

            {sickOpen && <AddSickLeaveModal employees={employees} onClose={() => setSickOpen(false)} />}
        </Wrap>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

const MonthBar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

const MonthLabel = styled.h3`
    margin: 0;
    min-width: 150px;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Legend = styled.div`
    margin-left: auto;
    display: flex;
    gap: 14px;
    font-size: 12.5px;
    color: ${ui.textSecondary};

    span { display: inline-flex; align-items: center; gap: 6px; }
`;

const cellFill = (state: CellState) => {
    if (state === 'absent') return css`background: #fde68a;`;
    if (state === 'pending') return css`background: repeating-linear-gradient(135deg, #fde68a 0 3px, #ffffff 3px 6px);`;
    return css``;
};

const Swatch = styled.span<{ $state: CellState }>`
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid ${ui.warnLine};
    ${p => cellFill(p.$state)}
`;

/* Przewija się sama siatka - strona zostaje w miejscu (także na telefonie). */
const GridScroll = styled.div`
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/** Wiersz tabeli dla czytnika ekranu, a dla siatki CSS - przezroczysty (komórki są jej dziećmi). */
const RowGroup = styled.div`
    display: contents;
`;

const Grid = styled.div`
    display: grid;
    min-width: max-content;
`;

const sticky = css`
    position: sticky;
    left: 0;
    z-index: 1;
    background: ${ui.surface};
    border-right: 1px solid ${ui.line};
`;

const HeadCell = styled.div<{ $off?: boolean; $today?: boolean; $sticky?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    padding: 6px 2px;
    border-bottom: 1px solid ${ui.line};
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.$today ? ui.brandInk : ui.textSecondary};
    background: ${p => p.$off ? ui.surfaceAlt : ui.surface};

    b { font-weight: 700; ${p => p.$today && css`color: ${ui.brandInk};`} }
    small { font-size: 10.5px; font-weight: 500; color: ${ui.textMuted}; }
    ${p => p.$sticky && css`${sticky} align-items: flex-start; padding-left: 12px;`}
`;

const NameCell = styled.div<{ $sticky?: boolean }>`
    display: flex;
    align-items: center;
    min-height: 34px;
    padding: 0 12px;
    border-bottom: 1px solid ${ui.lineFaint};
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.ink};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${p => p.$sticky && sticky}
`;

const DayCell = styled.div<{ $off: boolean; $state: CellState }>`
    min-height: 34px;
    border-bottom: 1px solid ${ui.lineFaint};
    border-left: 1px solid ${ui.lineFaint};
    background: ${p => p.$off ? ui.surfaceAlt : ui.surface};
    ${p => cellFill(p.$state)}
`;

const Empty = styled.p`
    margin: 0;
    padding: 16px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;
