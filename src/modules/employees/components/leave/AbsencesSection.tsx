// src/modules/employees/components/leave/AbsencesSection.tsx
//
// Sekcja „Nieobecności" pod kolejką wniosków (zakładka „Wnioski urlopowe"): osoby × dni
// miesiąca. Odpowiada na pytanie, które właściciel zadaje najczęściej - „kto jutro jest
// w pracy?" - z danych, które już są (rejestr urlopów i L4), bez domeny zmian i obsady,
// której system jeszcze nie ma.
//
// Pełna komórka = nieobecność pewna (urlop zatwierdzony, L4). Kreskowana = wniosek
// oczekujący, czyli nieobecność jeszcze niepewna - widzi ją tylko ten, kto rozpatruje.
// Siatka (MonthGrid) jest wspólna z wpisami godzin na zakładce „Czas pracy".
//
// Kto może dodawać urlopy, zaznacza je tu wprost: kliknięcie dnia w wierszu osoby albo
// przeciągnięcie po kilku dniach otwiera „Dodaj urlop" z osobą i terminem - bez szukania
// tej osoby i tych dni drugi raz w oknie.

import { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button, IconButton, SectionTitle, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useLeaveCalendar } from '../../hooks/useLeaves';
import { useLeaveRequestQueue } from '../../hooks/useLeaveRequests';
import { getPolishHolidays } from '../../utils/polishHolidays';
import { todayIso } from '../../utils/leaveRequestFormat';
import {
    DayCell as BaseDayCell, Grid, GridEmpty, GridScroll, MonthGridHead, MonthLegend, NameCell, RowGroup,
} from '../MonthGrid';
import { gridColumns, isOffDay, monthDays } from '../monthGridDays';
import { AddSickLeaveModal } from './AddSickLeaveModal';
import { AddLeaveModal } from './AddLeaveModal';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
const pad = (n: number) => String(n).padStart(2, '0');

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

export function AbsencesSection() {
    const { can } = usePermissions();
    const canApprove = can('EMPLOYEES_LEAVES_APPROVE');
    const canManage = can('EMPLOYEES_MANAGE');

    const [month, setMonth] = useState(() => todayIso().slice(0, 7));
    const [sickOpen, setSickOpen] = useState(false);
    /** Zaznaczanie dni urlopu w wierszu osoby: dzień chwycenia i dzień pod kursorem. */
    const [pick, setPick] = useState<{ employeeId: string; anchor: string; current: string } | null>(null);
    const [addLeave, setAddLeave] = useState<{ employeeId: string; start: string; end: string } | null>(null);
    const days = useMemo(() => monthDays(month), [month]);
    const from = days[0];
    const to = days[days.length - 1];
    const today = todayIso();

    const holidays = useMemo(() => getPolishHolidays(Number(month.slice(0, 4))), [month]);
    const { leaveDayMap, isLoading } = useLeaveCalendar(from, to);
    const { employees } = useEmployees({ search: '', page: 1, pageSize: 100 });
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
    // Zaznaczać można osoby z listy zespołu (ma je okno urlopu), nie tylko te z danymi.
    const pickable = useMemo(() => new Set(employees.map(e => e.id)), [employees]);
    const range = pick ? (pick.anchor <= pick.current ? [pick.anchor, pick.current] : [pick.current, pick.anchor]) : null;

    // Puszczenie przycisku gdziekolwiek kończy zaznaczanie i otwiera okno urlopu.
    useEffect(() => {
        if (!pick) return;
        const up = () => {
            const [start, end] = pick.anchor <= pick.current ? [pick.anchor, pick.current] : [pick.current, pick.anchor];
            setAddLeave({ employeeId: pick.employeeId, start, end });
            setPick(null);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPick(null); };
        window.addEventListener('pointerup', up);
        window.addEventListener('keydown', esc);
        return () => { window.removeEventListener('pointerup', up); window.removeEventListener('keydown', esc); };
    }, [pick]);
    const [y, m] = month.split('-').map(Number);

    return (
        <Wrap aria-labelledby="absences-title">
            {/* L4 przy grafiku, nie w nagłówku strony: tam stoi już wypełnione „Dodaj urlop"
                kolejki wniosków, a dwa wypełnione przyciski w jednym oknie to remis
                (CLAUDE.md §2). Wpis L4 dotyczy grafiku, więc stoi przy nim, jako kontur. */}
            <SectionHead>
                <SectionTitle id="absences-title">Nieobecności</SectionTitle>
                {canManage && (
                    <Button variant="outline" size="sm" onClick={() => setSickOpen(true)}>
                        <Plus aria-hidden="true" />Dodaj nieobecność (L4)
                    </Button>
                )}
            </SectionHead>

            <MonthBar>
                <IconButton label="Poprzedni miesiąc" variant="ghost" onClick={() => setMonth(p => shiftMonth(p, -1))}>
                    <ChevronLeft />
                </IconButton>
                <MonthLabel aria-live="polite">{MONTHS[m - 1]} {y}</MonthLabel>
                <IconButton label="Następny miesiąc" variant="ghost" onClick={() => setMonth(p => shiftMonth(p, 1))}>
                    <ChevronRight />
                </IconButton>
                <MonthLegend>
                    {canApprove && <span>Kliknij albo przeciągnij po dniach, żeby dodać urlop</span>}
                    <span><Swatch $state="absent" aria-hidden="true" />nieobecność</span>
                    {canApprove && <span><Swatch $state="pending" aria-hidden="true" />wniosek oczekuje</span>}
                </MonthLegend>
            </MonthBar>

            <GridScroll tabIndex={0} aria-label={`Grafik nieobecności, ${MONTHS[m - 1].toLowerCase()} ${y}`}>
                <Grid role="table" style={{ gridTemplateColumns: gridColumns(days.length) }}>
                    <MonthGridHead days={days} holidays={holidays} today={today} />

                    {rows.map(r => (
                        <RowGroup key={r.id} role="row">
                            <NameCell role="rowheader">{r.name}</NameCell>
                            {days.map(d => {
                                const state = r.days.get(d) ?? null;
                                const canPick = canApprove && pickable.has(r.id);
                                const picked = !!range && pick?.employeeId === r.id && d >= range[0] && d <= range[1];
                                return (
                                    <DayCell
                                        key={d}
                                        role="cell"
                                        $off={isOffDay(d, holidays)}
                                        $state={state}
                                        $picked={picked}
                                        $pickable={canPick}
                                        aria-label={state ? `${r.name}, ${d}: ${state === 'pending' ? 'wniosek oczekuje' : 'nieobecność'}` : undefined}
                                        onPointerDown={canPick ? e => {
                                            if (e.button !== 0) return;
                                            e.preventDefault();
                                            setPick({ employeeId: r.id, anchor: d, current: d });
                                        } : undefined}
                                        onPointerEnter={canPick ? () => {
                                            if (pick && pick.employeeId === r.id && pick.current !== d) setPick({ ...pick, current: d });
                                        } : undefined}
                                    />
                                );
                            })}
                        </RowGroup>
                    ))}
                </Grid>
                {!isLoading && !anyAbsence && <GridEmpty>W tym miesiącu nikt nie ma zaplanowanej nieobecności.</GridEmpty>}
            </GridScroll>

            {sickOpen && <AddSickLeaveModal employees={employees} onClose={() => setSickOpen(false)} />}
            {addLeave && (
                <AddLeaveModal
                    employeeId={addLeave.employeeId}
                    startDate={addLeave.start}
                    endDate={addLeave.end}
                    onClose={() => setAddLeave(null)}
                />
            )}
        </Wrap>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Wrap = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
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

const DayCell = styled(BaseDayCell)<{ $state: CellState; $picked: boolean; $pickable: boolean }>`
    ${p => cellFill(p.$state)}
    ${p => p.$pickable && css`
        cursor: cell;
        touch-action: pan-x;
        &:hover { box-shadow: inset 0 0 0 2px ${ui.brandLine}; }
    `}
    /* Zaznaczane dni: odcień marki bez wypełnienia, nad stanem komórki. */
    ${p => p.$picked && css`
        background: ${ui.brandTint};
        box-shadow: inset 0 0 0 2px ${ui.brand};
    `}
`;
