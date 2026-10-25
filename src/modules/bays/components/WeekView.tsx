// src/modules/bays/components/WeekView.tsx
//
// Tydzień: nawigacja, wybór układu (oś albo lista dnia) i jedna kolejka okien
// po geście - „Do kiedy?" → „Ten czas jest zajęty" → formularz rezerwacji.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, IconButton, Segmented, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import type { BaysSnapshot } from '../types';
import { addDays, dayMonth, fromDateKey, hoursOf, mondayOf, toDateKey, weekDays, rangeText, relativeDay, clockText, type Cell } from '../utils/slots';
import { buildWeekRows, overlapsInRange, type WeekBar } from '../utils/weekLayout';
import { baysApi } from '../api/baysApi';
import { useBaysMutation } from '../hooks/useBays';
import { WeekPlanner, type MoveRequest, type RangeRequest } from './WeekPlanner';
import { WeekDayList } from './WeekDayList';
import { BayBookingFlow } from './BayBookingFlow';
import { DurationDialog, OverlapDialog } from './planDialogs';

const Nav = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;

    h2 { margin: 0; font-size: 17px; font-weight: 700; color: ${ui.ink}; min-width: 0; }
`;

const SpanSwitch = styled.div`
    margin-left: auto;
`;

type Step =
    | { kind: 'duration'; bayId: string; cell: Cell }
    | { kind: 'overlap-new'; bayId: string; start: Date; end: Date; hits: WeekBar[] }
    | { kind: 'overlap-move'; move: MoveRequest }
    | { kind: 'book'; bayId: string; start: Date; end: Date };

interface Props {
    snap: BaysSnapshot;
    now: Date;
    canEdit: boolean;
}

/** Tydzień do pokazania: bieżący, a w niedzielę (zamknięte) - następny. */
const defaultMonday = (now: Date) => mondayOf(now.getDay() === 0 ? addDays(now, 1) : now);

/*
 * Zakres osi. Tydzień wystarcza podnośnikom (pół dnia to szeroki pasek), ale myjnia
 * podzielona na okienka po półtorej godziny ma w tygodniu paski na dwa centymetry -
 * „3 dni" i „Dzień" rozciągają tę samą oś, a przyciąganie zostaje to samo.
 */
type Span = 6 | 3 | 1;

/** `n` otwartych dni od `from` (włącznie), w przód albo w tył. */
const openDays = (from: string, n: number, dir: 1 | -1 = 1): string[] => {
    const out: string[] = [];
    let d = fromDateKey(from);
    for (let guard = 0; out.length < n && guard < 30; guard++, d = addDays(d, dir)) {
        const key = toDateKey(d);
        if (hoursOf(key)) out.push(key);
    }
    return dir === 1 ? out : out.reverse();
};

export function WeekView({ snap, now, canEdit }: Props) {
    const isTabletUp = useBreakpoint('md');
    const { showSuccess, showWarning } = useToast();
    const [span, setSpan] = useState<Span>(6);
    // Kotwica zakresu: poniedziałek w trybie tygodnia, pierwszy pokazany dzień w pozostałych.
    const [anchor, setAnchor] = useState(() => toDateKey(defaultMonday(now)));
    const days = useMemo(
        () => (span === 6 ? weekDays(mondayOf(fromDateKey(anchor))) : openDays(anchor, span)),
        [span, anchor],
    );
    const [day, setDay] = useState(() => toDateKey(now));
    const [step, setStep] = useState<Step | null>(null);
    const move = useBaysMutation(baysApi.moveBooking);
    const create = useBaysMutation(baysApi.createBooking);
    const remove = useBaysMutation(baysApi.deleteBooking);

    const bayById = (id: string) => snap.bays.find(b => b.id === id);
    const shift = (dir: 1 | -1) => {
        if (span === 6) {
            const next = toDateKey(addDays(fromDateKey(anchor), dir * 7));
            setAnchor(next);
            setDay(next);
            return;
        }
        const next = dir === 1 ? openDays(days[days.length - 1], 2)[1] : openDays(toDateKey(addDays(fromDateKey(days[0]), -1)), span, -1)[0];
        if (next) setAnchor(next);
    };
    const changeSpan = (next: Span) => {
        setSpan(next);
        // Z tygodnia na krótszy zakres: zaczynamy od dziś, jeśli dziś leży w pokazanym tygodniu.
        const today = toDateKey(now);
        if (next === 6) setAnchor(toDateKey(mondayOf(fromDateKey(days[0] ?? today))));
        else setAnchor(days.includes(today) ? openDays(today, 1)[0] : days[0]);
    };
    const isCurrent = days.includes(toDateKey(now)) || (span === 6 && toDateKey(mondayOf(fromDateKey(anchor))) === toDateKey(defaultMonday(now)));

    const onRange = (r: RangeRequest) => {
        if (r.overlaps.length) setStep({ kind: 'overlap-new', bayId: r.bayId, start: r.start, end: r.end, hits: r.overlaps });
        else setStep({ kind: 'book', bayId: r.bayId, start: r.start, end: r.end });
    };

    // Dotyk i telefon: najpierw długość, potem to samo sprawdzenie nałożenia co przy zaznaczeniu.
    const afterDuration = (bayId: string, start: Date, end: Date) => {
        const { rows } = buildWeekRows(snap, weekDays(mondayOf(start)), now);
        const row = rows.find(x => x.rowId === bayId);
        onRange({ bayId, start, end, overlaps: row ? overlapsInRange(row, start, end) : [] });
    };

    const applyMove = async (m: MoveRequest) => {
        setStep(null);
        const car = snap.cars.find(c => c.id === m.carId);
        if (m.bookingId) await move.mutateAsync([m.bookingId, m.bayId, m.start, m.end]);
        else await create.mutateAsync([m.bayId, m.carId, m.start, m.end]);
        // Plan za obiecanym odbiorem: ostrzeżenie, ale termin odbioru zmienia tylko
        // człowiek - od niego zależą SMS-y do klienta.
        if (car?.promisedAt && m.end > new Date(car.promisedAt)) {
            const promised = new Date(car.promisedAt);
            showWarning(
                `${car.licensePlate}: plan kończy się po terminie odbioru`,
                `Klientowi obiecano ${relativeDay(toDateKey(promised), now)} ${clockText(promised)}. Zmień termin w wizycie albo skróć plan.`,
            );
        } else {
            showSuccess(`${car?.licensePlate ?? 'Auto'} w planie`, `${bayById(m.bayId)?.name}, ${rangeText(m.start, m.end, now)}.`);
        }
    };

    const onMove = (m: MoveRequest) => {
        if (m.overlaps.length) setStep({ kind: 'overlap-move', move: m });
        else void applyMove(m);
    };

    const first = days[0];
    const last = days[days.length - 1];

    return (
        <>
            <Nav>
                <IconButton label="Wcześniej" onClick={() => shift(-1)}><ChevronLeft /></IconButton>
                <IconButton label="Później" onClick={() => shift(1)}><ChevronRight /></IconButton>
                <h2>{first && last ? (first === last ? `${relativeDay(first, now)}, ${dayMonth(first)}` : `${dayMonth(first)} – ${dayMonth(last)}`) : ''}</h2>
                {!isCurrent && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setAnchor(span === 6 ? toDateKey(defaultMonday(now)) : openDays(toDateKey(now), 1)[0]);
                        setDay(toDateKey(now));
                    }}>Dziś</Button>
                )}
                {isTabletUp && (
                    <SpanSwitch>
                        <Segmented<`${Span}`>
                            label="Zakres osi"
                            size="sm"
                            value={`${span}`}
                            onChange={v => changeSpan(Number(v) as Span)}
                            options={[{ value: '6', label: 'Tydzień' }, { value: '3', label: '3 dni' }, { value: '1', label: 'Dzień' }]}
                        />
                    </SpanSwitch>
                )}
            </Nav>

            {isTabletUp ? (
                <WeekPlanner
                    snap={snap}
                    now={now}
                    days={days}
                    canEdit={canEdit}
                    onRange={onRange}
                    onTapCell={(bayId, cell) => setStep({ kind: 'duration', bayId, cell })}
                    onMove={onMove}
                    onDeleteBooking={id => remove.mutate([id])}
                />
            ) : (
                <WeekDayList
                    snap={snap}
                    now={now}
                    days={days}
                    day={day}
                    onDay={setDay}
                    canEdit={canEdit}
                    onPlan={(bayId, cell) => setStep({ kind: 'duration', bayId, cell })}
                />
            )}

            {step?.kind === 'duration' && (
                <DurationDialog
                    bayName={bayById(step.bayId)?.name ?? ''}
                    from={step.cell}
                    slotsPerDay={bayById(step.bayId)?.slotsPerDay ?? 2}
                    now={now}
                    onClose={() => setStep(null)}
                    onConfirm={end => afterDuration(step.bayId, step.cell.start, end)}
                />
            )}
            {step?.kind === 'overlap-new' && (
                <OverlapDialog
                    snap={snap}
                    bayId={step.bayId}
                    start={step.start}
                    end={step.end}
                    now={now}
                    hits={step.hits}
                    confirmLabel="Utwórz mimo to"
                    onClose={() => setStep(null)}
                    onConfirm={() => setStep({ kind: 'book', bayId: step.bayId, start: step.start, end: step.end })}
                    onUseBay={bayId => setStep({ kind: 'book', bayId, start: step.start, end: step.end })}
                />
            )}
            {step?.kind === 'overlap-move' && (
                <OverlapDialog
                    snap={snap}
                    bayId={step.move.bayId}
                    start={step.move.start}
                    end={step.move.end}
                    now={now}
                    hits={step.move.overlaps}
                    confirmLabel="Zostaw oba"
                    onClose={() => setStep(null)}
                    onConfirm={() => void applyMove(step.move)}
                    onUseBay={bayId => void applyMove({ ...step.move, bayId })}
                />
            )}
            {step?.kind === 'book' && (
                <BayBookingFlow
                    bayId={step.bayId}
                    bayName={bayById(step.bayId)?.name ?? ''}
                    slotsPerDay={bayById(step.bayId)?.slotsPerDay ?? 2}
                    start={step.start}
                    end={step.end}
                    onClose={() => setStep(null)}
                />
            )}
        </>
    );
}
