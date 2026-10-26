// src/modules/bays/components/WeekDayList.tsx
//
// Tydzień na telefonie. Oś tygodnia na 375 px to kreski, których nie da się
// przeczytać ani trafić palcem - więc telefon pokazuje JEDEN dzień: pasek dni u góry
// (z liczbą wolnych okienek), pod nim stanowiska, każde ze swoimi okienkami.
// Wolne okienko to przycisk „Zaplanuj" - dotyk zamiast przeciągania. Bieżące okienko
// ma znacznik „teraz", żeby było wiadomo, gdzie jesteśmy w dniu.

import styled from 'styled-components';
import { CalendarPlus, Hourglass } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, cellIsFree, freeCellsOn, type WeekBar } from '../utils/weekLayout';
import { cellText, dayMonth, dayShort, toDateKey, type Cell } from '../utils/slots';
import { Avatar, Plate } from './primitives';

const DayStrip = styled.div`
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(64px, 1fr);
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
`;

const DayBtn = styled.button<{ $on: boolean; $today: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 8px 4px;
    min-height: 56px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${p => (p.$on ? ui.brandLine : ui.line)};
    background: ${p => (p.$on ? ui.brandTint : ui.surface)};
    font-family: inherit;
    cursor: pointer;

    strong { font-size: 13.5px; color: ${p => (p.$on || p.$today ? ui.brandDeep : ui.ink)}; }
    span { font-size: 11.5px; color: ${ui.textMuted}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const BayBlock = styled.section`
    display: flex;
    flex-direction: column;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    overflow: hidden;
`;

const BayHead = styled.header`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px 8px;

    h3 { margin: 0; font-size: 15px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const CellRow = styled.div<{ $now: boolean; $past: boolean }>`
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 9px 14px;
    border-top: 1px solid ${ui.lineSoft};
    box-shadow: ${p => (p.$now ? `inset 3px 0 0 ${ui.brand}` : 'none')};
    background: ${p => (p.$past ? ui.surfaceSoft : 'transparent')};
`;

const CellName = styled.div<{ $now: boolean }>`
    display: flex;
    flex-direction: column;
    padding-top: 6px;
    font-size: 12.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${p => (p.$now ? ui.brandDeep : ui.textSecondary)};

    small { font-size: 11px; font-weight: 700; color: ${ui.brand}; }
`;

const Items = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const Item = styled.button<{ $kind: 'done' | 'active' | 'plan' }>`
    display: flex;
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 7px 10px;
    border-radius: ${ui.radiusRow};
    border: ${p => (p.$kind === 'plan' ? `1.5px dashed ${ui.brandLine}` : `1px solid ${p.$kind === 'active' ? ui.brandLine : ui.line}`)};
    background: ${p => (p.$kind === 'active' ? ui.brandTintHover : p.$kind === 'done' ? ui.surfaceAlt : ui.surface)};
    font-size: 12.5px;
    color: ${ui.inkSoft};

    > span:last-child { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    > span:last-child > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const FreeText = styled.div`
    padding-top: 6px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

interface Props {
    snap: BaysSnapshot;
    now: Date;
    days: string[];
    day: string;
    onDay: (d: string) => void;
    canEdit: boolean;
    onPlan: (bayId: string, cell: Cell) => void;
    /** Stuknięcie w auto: podgląd usług (ten sam co na osi). */
    onOpenBar: (bar: WeekBar, bayId: string) => void;
}

export function WeekDayList({ snap, now, days, day, onDay, canEdit, onPlan, onOpenBar }: Props) {
    const { rows } = buildWeekRows(snap, days, now);
    const todayKey = toDateKey(now);
    const current = days.includes(day) ? day : days[0];

    return (
        <>
            <DayStrip role="group" aria-label="Dzień tygodnia">
                {days.map(d => {
                    const free = rows.reduce((sum, r) => sum + freeCellsOn(r, d, now), 0);
                    return (
                        <DayBtn key={d} type="button" $on={d === current} $today={d === todayKey} aria-pressed={d === current} onClick={() => onDay(d)}>
                            <strong>{d === todayKey ? 'dziś' : dayShort(d)}</strong>
                            <strong>{dayMonth(d)}</strong>
                            <span>{d < todayKey ? 'minęło' : `${free} wolne`}</span>
                        </DayBtn>
                    );
                })}
            </DayStrip>

            {rows.map(row => (
                <BayBlock key={row.rowId} aria-label={row.bay.name}>
                    <BayHead>
                        <h3>{row.bay.name}</h3>
                    </BayHead>
                    {row.cells.filter(c => c.date === current).map(c => {
                        const here = row.bars.filter(b => b.start < c.end && b.end > c.start);
                        const isNow = c.start <= now && now < c.end;
                        const past = c.end <= now;
                        const canPlan = canEdit && !past && cellIsFree(row, c);
                        return (
                            <CellRow key={c.start.toISOString()} $now={isNow} $past={past}>
                                <CellName $now={isNow}>
                                    {cellText(c)}
                                    {isNow && <small>teraz</small>}
                                </CellName>
                                <Items>
                                    {here.map(b => {
                                        const person = snap.settings.trackPeople ? snap.people.find(p => p.id === b.personIds[0]) : undefined;
                                        const curing = b.curingUntil && new Date(b.curingUntil) > now;
                                        return (
                                            <Item key={b.id} type="button" $kind={b.kind} onClick={() => onOpenBar(b, row.rowId)}>
                                                {person ? <Avatar person={person} size={24} /> : curing ? <Hourglass size={14} aria-hidden="true" /> : null}
                                                <span>
                                                    {b.car.licensePlate && <Plate $size="sm">{b.car.licensePlate}</Plate>}
                                                    <span>
                                                        {b.kind === 'plan' ? `Plan: ${b.car.jobTitle}`
                                                            : curing ? `Schnie do ${formatClockTime(b.curingUntil)}`
                                                                : b.car.jobTitle}
                                                    </span>
                                                </span>
                                            </Item>
                                        );
                                    })}
                                    {canPlan && (
                                        <Button variant="tinted" size="sm" onClick={() => onPlan(row.rowId, c)} style={{ alignSelf: 'flex-start' }}>
                                            <CalendarPlus aria-hidden="true" />Zaplanuj
                                        </Button>
                                    )}
                                    {here.length === 0 && !canPlan && <FreeText>{past ? 'minęło' : 'wolne'}</FreeText>}
                                </Items>
                            </CellRow>
                        );
                    })}
                </BayBlock>
            ))}
        </>
    );
}
