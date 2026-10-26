// src/modules/bays/components/WeekView.tsx
//
// Tydzień: nawigacja, wybór układu (oś albo lista dnia) i jedna kolejka okien
// po geście - „Do kiedy?" → „Ten czas jest zajęty" → formularz rezerwacji.
//
// Kolejny etap auta (podnośnik, potem myjnia): „Dodaj etap" w podglądzie przełącza oś
// w tryb wskazywania - następne zaznaczenie czasu tworzy plan dla TEGO auta, bez
// formularza rezerwacji (auto i wizyta już są).

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, IconButton, Notice, Segmented, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import { formatScheduleDateTime } from '@/common/dateTime';
import type { BaysSnapshot } from '../types';
import { addDays, dayMonth, fromDateKey, hoursOf, mondayOf, toDateKey, weekDays, relativeDay, type Cell } from '../utils/slots';
import { buildWeekRows, overlapsInRange, type WeekBar } from '../utils/weekLayout';
import { baysApi } from '../api/baysApi';
import { useBaysMutation, useBaysSnapshot, usePatchBoard } from '../hooks/useBays';
import { WeekPlanner, type MoveRequest, type RangeRequest } from './WeekPlanner';
import { WeekDayList } from './WeekDayList';
import { BayBookingFlow } from './BayBookingFlow';
import { DurationDialog, OverlapDialog } from './planDialogs';
import { BarPreviewDrawer } from './BarPreviewDrawer';
import { carLabel } from '../utils/labels';

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

export function WeekView({ snap: initial, now, canEdit }: Props) {
    const isTabletUp = useBreakpoint('md');
    const { showError, showWarning } = useToast();
    const patchBoard = usePatchBoard();
    const [span, setSpan] = useState<Span>(6);
    // Kotwica zakresu: poniedziałek w trybie tygodnia, pierwszy pokazany dzień w pozostałych.
    const [anchor, setAnchor] = useState(() => toDateKey(defaultMonday(now)));
    const days = useMemo(
        () => (span === 6 ? weekDays(mondayOf(fromDateKey(anchor))) : openDays(anchor, span)),
        [span, anchor],
    );
    // Odczyt hali w zakresie pokazanej osi; do czasu odpowiedzi - odczyt tablicy (ten tydzień).
    const range = useMemo(() => ({
        from: fromDateKey(days[0] ?? toDateKey(now)),
        to: addDays(fromDateKey(days[days.length - 1] ?? toDateKey(now)), 1),
    }), [days, now]);
    const { data: weekSnap } = useBaysSnapshot(range);
    const snap = weekSnap ?? initial;
    const [day, setDay] = useState(() => toDateKey(now));
    const [step, setStep] = useState<Step | null>(null);
    const [preview, setPreview] = useState<{ bar: WeekBar; bayId: string } | null>(null);
    /** Auto, dla którego następne zaznaczenie na osi tworzy kolejny etap. */
    const [placing, setPlacing] = useState<string | null>(null);
    const placingCar = placing ? snap.cars.find(c => c.id === placing) : undefined;
    useEffect(() => {
        if (!placing) return;
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlacing(null); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [placing]);
    const move = useBaysMutation(baysApi.moveBooking);
    const create = useBaysMutation(baysApi.createBooking);
    const remove = useBaysMutation(baysApi.deleteBooking);
    const end = useBaysMutation(baysApi.endStint);

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
        if (placingCar) {
            // Etap dla wskazanego auta: zapis jak przy przeciągnięciu z paska „Oczekuje na przypisanie".
            setPlacing(null);
            onMove({ bookingId: null, carId: placingCar.id, bayId: r.bayId, start: r.start, end: r.end, overlaps: r.overlaps });
            return;
        }
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
        const start = m.start.toISOString();
        const end = m.end.toISOString();
        // Pasek staje na nowym miejscu od razu; zapis idzie w tle.
        await patchBoard(s => ({
            ...s,
            bookings: m.bookingId
                ? s.bookings.map(b => (b.id === m.bookingId ? { ...b, bayId: m.bayId, start, end } : b))
                : [...s.bookings, { id: `pending-${m.carId}`, bayId: m.bayId, carId: m.carId, start, end }],
        }));
        try {
            if (m.bookingId) await move.mutateAsync([m.bookingId, m.bayId, m.start, m.end]);
            else if (car) await create.mutateAsync([m.bayId, { visitId: car.visitId, appointmentId: car.visitId ? null : car.appointmentId }, m.start, m.end]);
        } catch {
            showError('Nie udało się zapisać planu', 'Pasek wrócił na poprzednie miejsce.');
            return;
        }
        // Przesunięcie widać na osi - komunikat tylko wtedy, gdy jest coś do przeczytania:
        // plan za obiecanym odbiorem. Termin odbioru zmienia człowiek, nie oś.
        if (car?.promisedAt && m.end > new Date(car.promisedAt)) {
            const promised = new Date(car.promisedAt);
            // Termin z kalendarza (koniec wizyty) - pełna data, bez „jutro", żeby nie trzeba było
            // przeliczać, o który dzień chodzi.
            showWarning(`Zgodnie z kalendarzem pojazd powinien zostać wydany klientowi: ${formatScheduleDateTime(promised)}.`);
        }
    };

    const removeBooking = async (bookingId: string) => {
        await patchBoard(s => ({ ...s, bookings: s.bookings.filter(b => b.id !== bookingId) }));
        remove.mutate([bookingId], {
            onError: () => showError('Nie udało się usunąć z planu', 'Spróbuj ponownie.'),
        });
    };

    /**
     * „Wyrzucenie" auta, które stoi na stanowisku: zamknięcie odcinka pracy (jak „Zakończ"
     * z wyborem „czeka na przypisanie") i usunięcie jego planu na tym stanowisku. Odcinek
     * zostaje w historii jako zrobiony - fakt, że auto tu stało, nie znika.
     */
    const unassign = async (bar: WeekBar) => {
        if (!bar.car.visitId) return;
        try {
            await end.mutateAsync([bar.car.visitId, 'DONE']);
            if (bar.bookingId) await remove.mutateAsync([bar.bookingId]);
        } catch {
            showError('Nie udało się zdjąć auta ze stanowiska', 'Spróbuj ponownie.');
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

            {placingCar && (
                <Notice
                    tone="info"
                    title={`Kolejny etap dla ${carLabel(placingCar)}`}
                    action={<Button variant="outline" size="sm" onClick={() => setPlacing(null)}>Anuluj</Button>}
                >
                    {isTabletUp ? 'Zaznacz na osi stanowisko i czas.' : 'Wybierz dzień i stuknij „Zaplanuj” przy wolnym okienku.'}
                </Notice>
            )}

            {isTabletUp ? (
                <WeekPlanner
                    snap={snap}
                    now={now}
                    days={days}
                    canEdit={canEdit}
                    onRange={onRange}
                    onTapCell={(bayId, cell) => setStep({ kind: 'duration', bayId, cell })}
                    onMove={onMove}
                    onUnplan={id => void removeBooking(id)}
                    onOpenBar={(bar, bayId) => setPreview({ bar, bayId })}
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
                    onOpenBar={(bar, bayId) => setPreview({ bar, bayId })}
                />
            )}

            {preview && (
                <BarPreviewDrawer
                    bar={preview.bar}
                    snap={snap}
                    now={now}
                    canEdit={canEdit}
                    onClose={() => setPreview(null)}
                    onAddStage={canEdit ? () => { setPlacing(preview.bar.carId); setPreview(null); } : undefined}
                    onDeleteBooking={id => void removeBooking(id)}
                    onUnassign={() => void unassign(preview.bar)}
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
                    slotsPerDay={bayById(step.bayId)?.slotsPerDay ?? 2}
                    start={step.start}
                    end={step.end}
                    onClose={() => setStep(null)}
                />
            )}
        </>
    );
}
