// src/modules/employees/components/leave/LeaveRangeCalendar.tsx
//
// Termin urlopu wybierany wprost w oknie: kalendarz stoi na stałe, nie wyskakuje z pola.
// Dawniej dwa pola „Od"/„Do" otwierały okienko z jednym miesiącem, które w oknie urlopu
// nie mieściło się ani pod polem, ani nad nim - i przewijało się w środku.
//
// Kliknięcie dnia to urlop jednodniowy; drugie kliknięcie późniejszego dnia albo
// przeciągnięcie po kilku dniach - zakres. Na szerokim oknie dwa miesiące obok siebie
// (urlop przez przełom miesiąca bez przewijania), na wąskim jeden.

import { useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, ui } from '@/common/components/ui';
import { getPolishHolidays } from '../../utils/polishHolidays';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
/** Dopełniacz do etykiet dni: „7 października". */
const MONTHS_OF = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const WEEKDAYS = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Pierwszy dzień miesiąca `YYYY-MM` przesunięty o [delta] miesięcy. */
const shift = (month: string, delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Dni miesiąca z pustymi polami przed pierwszym (tydzień od poniedziałku). */
const monthCells = (month: string): (string | null)[] => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(y, m, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => iso(y, m - 1, i + 1))];
};

const Wrap = styled.div`
    container: leave-calendar / inline-size;
    display: flex;
    flex-direction: column;
    gap: 8px;
    user-select: none;
`;

const Months = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;

    /* Drugi miesiąc tylko na szerokim oknie. */
    > :nth-child(2) { display: none; }

    @container leave-calendar (min-width: 600px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        > :nth-child(2) { display: flex; }
        /* Dwa miesiące: „dalej" tylko przy drugim. */
        [data-narrow-next] { visibility: hidden; }
    }
`;

const Month = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const MonthHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;

    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
`;

const DayGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 2px 0;
`;

const Weekday = styled.span`
    padding-bottom: 4px;
    text-align: center;
    font-size: 11.5px;
    font-weight: 600;
    color: ${ui.textMuted};
`;

const Day = styled.button<{ $off: boolean; $inRange: boolean; $edge: 'start' | 'end' | 'both' | null; $today: boolean }>`
    position: relative;
    height: 36px;
    padding: 0;
    border: none;
    background: ${p => (p.$inRange ? ui.brandTint : 'transparent')};
    font-family: inherit;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    color: ${p => (p.$off ? ui.textMuted : ui.ink)};
    cursor: pointer;
    touch-action: none;

    ${p => p.$edge === 'start' && css`border-radius: 10px 0 0 10px;`}
    ${p => p.$edge === 'end' && css`border-radius: 0 10px 10px 0;`}
    ${p => p.$edge === 'both' && css`border-radius: 10px;`}
    ${p => p.$edge && css`
        background: ${ui.brand};
        color: #ffffff;
        font-weight: 700;
    `}
    ${p => p.$today && !p.$edge && css`
        font-weight: 700;
        color: ${ui.brandDeep};
    `}

    &:hover { ${p => !p.$edge && css`background: ${p.$inRange ? ui.brandTintHover : ui.surfaceAlt};`} }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; z-index: 1; }
`;

interface Props {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
    /** Dzisiejsza data (YYYY-MM-DD) - wyróżniona w kalendarzu. */
    today: string;
    /** Opis pola dla czytników ekranu. */
    label?: string;
}

export function LeaveRangeCalendar({ start, end, onChange, today, label = 'Termin urlopu' }: Props) {
    const [month, setMonth] = useState(() => (start || today).slice(0, 7));
    const months = [month, shift(month, 1)];
    // Dwa widoczne miesiące mogą leżeć w dwóch latach (grudzień i styczeń).
    const year = Number(month.slice(0, 4));
    const holidays = useMemo(() => {
        const all = new Set<string>();
        [year, year + 1].forEach(y => getPolishHolidays(y).forEach(d => all.add(d)));
        return all;
    }, [year]);
    // Przeciąganie: dzień, od którego zaczęto, i czy kursor już się ruszył (inaczej to kliknięcie).
    const drag = useRef<{ anchor: string; moved: boolean } | null>(null);
    /** Po przeciągnięciu przeglądarka i tak wyśle kliknięcie - nie może ono zamienić zakresu w jeden dzień. */
    const suppress = useRef(false);

    const isOff = (day: string) => {
        const wd = new Date(`${day}T12:00:00`).getDay();
        return wd === 0 || wd === 6 || holidays.has(day);
    };

    const click = (day: string) => {
        // Pierwszy dzień albo nowy wybór po zakresie / wcześniejszym dniu: urlop jednodniowy.
        if (!start || start !== end || day < start) { onChange(day, day); return; }
        onChange(start, day);
    };

    const dayAt = (e: React.PointerEvent): string | null =>
        (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-day]')?.dataset.day ?? null;

    return (
        <Wrap role="group" aria-label={label}>
            <Months>
                {months.map((m, idx) => {
                    const [y, mm] = m.split('-').map(Number);
                    return (
                        <Month key={m}>
                            <MonthHead>
                                {idx === 0
                                    ? <IconButton label="Poprzedni miesiąc" variant="ghost" size="sm" onClick={() => setMonth(shift(month, -1))}><ChevronLeft /></IconButton>
                                    : <span />}
                                <strong>{MONTHS[mm - 1]} {y}</strong>
                                {/* Strzałka „dalej" przy ostatnim widocznym miesiącu - na wąskim to pierwszy. */}
                                <span data-narrow-next={idx === 0 ? '' : undefined}>
                                    <IconButton label="Następny miesiąc" variant="ghost" size="sm" onClick={() => setMonth(shift(month, 1))}><ChevronRight /></IconButton>
                                </span>
                            </MonthHead>
                            <DayGrid
                                onPointerDown={e => {
                                    const day = dayAt(e);
                                    if (!day || e.button !== 0) return;
                                    drag.current = { anchor: day, moved: false };
                                }}
                                onPointerMove={e => {
                                    const d = drag.current;
                                    if (!d || e.buttons !== 1) return;
                                    const day = dayAt(e);
                                    if (!day || day === d.anchor && !d.moved) return;
                                    d.moved = true;
                                    onChange(day < d.anchor ? day : d.anchor, day < d.anchor ? d.anchor : day);
                                }}
                                onPointerUp={() => { if (drag.current?.moved) suppress.current = true; drag.current = null; }}
                            >
                                {WEEKDAYS.map(w => <Weekday key={w} aria-hidden="true">{w}</Weekday>)}
                                {monthCells(m).map((day, i) => {
                                    if (!day) return <span key={`e${i}`} />;
                                    const inRange = !!start && !!end && day >= start && day <= end;
                                    const edge = day === start && day === end ? 'both' : day === start ? 'start' : day === end ? 'end' : null;
                                    return (
                                        <Day
                                            key={day}
                                            type="button"
                                            data-day={day}
                                            $off={isOff(day)}
                                            $inRange={inRange}
                                            $edge={inRange ? edge : null}
                                            $today={day === today}
                                            aria-pressed={inRange}
                                            aria-label={`${Number(day.slice(8))} ${MONTHS_OF[mm - 1]}${holidays.has(day) ? ', święto' : ''}`}
                                            onClick={() => {
                                                if (suppress.current) { suppress.current = false; return; }
                                                click(day);
                                            }}
                                        >
                                            {Number(day.slice(8))}
                                        </Day>
                                    );
                                })}
                            </DayGrid>
                        </Month>
                    );
                })}
            </Months>
        </Wrap>
    );
}
