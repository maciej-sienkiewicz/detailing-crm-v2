// src/modules/bays/components/NowTimeline.tsx
//
// „Teraz" jako dzień hali: kolumna = stanowisko, oś czasu biegnie w dół, od otwarcia
// do zamknięcia (Ustawienia → Stanowiska → Godziny hali). Dawniej stanowiska były
// kartami z listą aut - nie było widać, od kiedy auto stoi, co przyjedzie po nim ani
// ile dnia zostało. Pionowa oś odpowiada na to bez czytania: wysokość bloku to czas.
//
// W kolumnie leżą trzy rodzaje bloków, te same co w planie tygodnia: zrobione (szare,
// jedna linia), trwa (karta z akcją - jedyny blok, przy którym się coś klika) i plan
// (przerywany obrys). Pozycje liczy ten sam `buildWeekRows` co tydzień, tylko dla
// jednego dnia - jeden algorytm nałożeń i pasów dla obu widoków.
//
// Gdy dziś hala jest zamknięta (niedziela), oś bierze godziny dnia roboczego. Oś
// rozciąga się też o to, co dziś faktycznie się działo poza godzinami (wjazd o 20:15,
// praca do nocy) - inaczej taki blok wypadał pod osią albo zlewał się w kreskę na jej końcu.

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Hourglass } from 'lucide-react';
import { ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, type WeekBar } from '../utils/weekLayout';
import { clockText, fromDateKey, hoursOf, studioHours, toDateKey, weekX, type DayHours, type OpeningHours } from '../utils/slots';
import { Plate } from './primitives';

/** Wysokość godziny. 14 godzin hali to ~840 px - widok przewija się w ramce do „teraz". */
const HOUR_PX = 60;
const GUTTER = 52;

const Frame = styled.div`
    position: relative;
    overflow: auto;
    max-height: max(520px, calc(100vh - 210px));
    overscroll-behavior: contain;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
`;

const Grid = styled.div<{ $cols: number }>`
    display: grid;
    grid-template-columns: ${GUTTER}px repeat(${p => p.$cols}, minmax(200px, 1fr));
    min-width: ${p => GUTTER + p.$cols * 200}px;
`;

const HeadCell = styled.div`
    position: sticky;
    top: 0;
    z-index: 6;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 12px 12px 10px;
    background: ${ui.surface};
    border-bottom: 1px solid ${ui.line};
    border-left: 1px solid ${ui.line};

    h2 { margin: 0; font-size: 14.5px; font-weight: 700; color: ${ui.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    span { flex-shrink: 0; font-size: 12.5px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const Corner = styled.div`
    position: sticky;
    top: 0;
    left: 0;
    z-index: 7;
    background: ${ui.surface};
    border-bottom: 1px solid ${ui.line};
`;

const Gutter = styled.div`
    position: sticky;
    left: 0;
    z-index: 5;
    background: ${ui.surface};
`;

const HourLabel = styled.span`
    position: absolute;
    right: 8px;
    transform: translateY(-50%);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: ${ui.textFaint};
`;

const NowLabel = styled.span`
    position: absolute;
    right: 4px;
    transform: translateY(-50%);
    padding: 1px 4px;
    border-radius: 4px;
    background: ${ui.surface};
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${ui.brandInk};
`;

/* Linie pełnych godzin jako tło kolumny - przesunięte, gdy hala otwiera się o pół do. */
const Col = styled.div<{ $offset: number; $drop: boolean }>`
    position: relative;
    border-left: 1px solid ${ui.line};
    background-image: repeating-linear-gradient(to bottom, ${ui.lineSoft} 0 1px, transparent 1px ${HOUR_PX}px);
    background-position: 0 ${p => p.$offset}px;
    transition: background-color 120ms ease;

    ${p => p.$drop && css`background-color: ${ui.brandTint};`}
`;

const Past = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    background: rgba(241, 245, 249, 0.55);
    pointer-events: none;
`;

/* „Teraz" - włos pod blokami, tylko wskazuje miejsce. */
const NowLine = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px solid ${ui.brandLine};
    z-index: 1;
    pointer-events: none;
`;

const Block = styled.div`
    position: absolute;
    z-index: 2;
    padding: 2px 4px;
    box-sizing: border-box;
    min-width: 0;
`;

/* Zrobione i plan: jedna-dwie linie, cały blok otwiera podgląd usług. */
const Slab = styled.button<{ $kind: 'done' | 'plan'; $conflict: boolean; $short: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    height: 100%;
    min-width: 0;
    justify-content: ${p => (p.$short ? 'center' : 'flex-start')};
    padding: ${p => (p.$short ? '0 9px' : '5px 9px')};
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 8px;
    text-align: left;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.35;
    cursor: pointer;
    ${p => (p.$kind === 'done'
        ? css`background: ${ui.surfaceAlt}; border: 1px solid ${ui.line}; color: ${ui.textSecondary};`
        : css`background: ${ui.surface}; border: 1.5px dashed ${ui.brandLine}; color: ${ui.inkSoft};`)}
    ${p => p.$conflict && css`border-color: #f59e0b;`}

    > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const SlabTop = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    svg { flex-shrink: 0; }
`;

/* Karta trwającej pracy rośnie z czasem, ale nie mniej niż jej treść. */
const ActiveWrap = styled.div<{ $minH: number }>`
    min-height: ${p => p.$minH}px;
    display: flex;
    flex-direction: column;
    cursor: pointer;

    > article {
        flex: 1;
        border-color: ${ui.brandLine};
        background: ${ui.brandTintHover};
    }
`;

const minuteOf = (t: Date) => t.getHours() * 60 + t.getMinutes();

/** Godziny osi poszerzone do pełnych godzin wokół dzisiejszych wjazdów, zjazdów i planów. */
const widenToEvents = (h: DayHours, snap: BaysSnapshot, todayKey: string, now: Date): DayHours => {
    const dayStart = new Date(`${todayKey}T00:00:00`);
    const dayEnd = new Date(`${todayKey}T23:59:59`);
    const spans = [
        ...snap.stints.map(s => [new Date(s.startedAt), s.endedAt ? new Date(s.endedAt) : now] as const),
        ...snap.bookings.map(b => [new Date(b.start), new Date(b.end)] as const),
    ].filter(([a, b]) => a <= dayEnd && b >= dayStart);
    let { opens, closes } = h;
    for (const [a, b] of spans) {
        opens = Math.min(opens, a < dayStart ? opens : Math.floor(minuteOf(a) / 60) * 60);
        closes = Math.max(closes, b > dayEnd ? closes : Math.min(1440, Math.ceil((minuteOf(b) + 1) / 60) * 60));
    }
    return { opens, closes };
};

interface Props {
    snap: BaysSnapshot;
    now: Date;
    /** Karta trwającej pracy z akcjami (Zakończ, Więcej) - buduje ją tablica. */
    renderActive: (bar: WeekBar, bayId: string) => ReactNode;
    onOpenBar: (bar: WeekBar, bayId: string) => void;
    /** Zdarzenia upuszczenia karty na stanowisko; puste, gdy przeciąganie jest wyłączone. */
    dropProps: (bayId: string) => object;
    dropOverBayId: string | null;
}

export function NowTimeline({ snap, now, renderActive, onOpenBar, dropProps, dropOverBayId }: Props) {
    const frameRef = useRef<HTMLDivElement>(null);
    const todayKey = toDateKey(now);
    const base = studioHours();
    const axis = widenToEvents(hoursOf(todayKey) ?? base[1] ?? { opens: 360, closes: 1200 }, snap, todayKey, now);
    // Godziny osi wpisane w dzisiejszy dzień tygodnia - reszta liczy się jak w planie tygodnia.
    const hours: OpeningHours = { ...base, [fromDateKey(todayKey).getDay()]: axis };
    const days = [todayKey];
    const { rows } = buildWeekRows(snap, days, now, hours);
    const total = ((axis.closes - axis.opens) / 60) * HOUR_PX;
    const yOf = (t: Date) => weekX(t, days, hours) * total;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowInside = nowMin >= axis.opens && nowMin <= axis.closes;
    const nowY = yOf(now);
    const hourMarks = Array.from({ length: Math.floor(axis.closes / 60) - Math.ceil(axis.opens / 60) + 1 }, (_, i) => Math.ceil(axis.opens / 60) + i);

    // Ramka otwiera się na „teraz", a nie na szóstej rano.
    useLayoutEffect(() => {
        const el = frameRef.current;
        if (el) el.scrollTop = Math.max(0, nowY - 140);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const box = (bar: WeekBar) => {
        const top = yOf(bar.start);
        return {
            top,
            height: Math.max(30, yOf(bar.end) - top),
            left: `${(bar.lane / bar.laneCount) * 100}%`,
            width: `${100 / bar.laneCount}%`,
        };
    };

    return (
        <Frame ref={frameRef}>
            <Grid $cols={rows.length}>
                <Corner />
                {rows.map(row => {
                    const busy = row.bars.filter(b => b.kind === 'active').length;
                    return (
                        <HeadCell key={row.rowId}>
                            <h2 id={`col-${row.rowId}`}>{row.bay.name}</h2>
                            <span>{row.bay.capacity > 1 ? `${busy} z ${row.bay.capacity}` : busy ? 'zajęte' : 'wolne'}</span>
                        </HeadCell>
                    );
                })}

                <Gutter style={{ height: total }} aria-hidden="true">
                    {hourMarks.map(h => {
                        const y = ((h * 60 - axis.opens) / 60) * HOUR_PX;
                        // Godzina tuż przy „teraz" ustępuje etykiecie czasu.
                        if (nowInside && Math.abs(y - nowY) < 12) return null;
                        return <HourLabel key={h} style={{ top: Math.max(7, Math.min(total - 7, y)) }}>{h}:00</HourLabel>;
                    })}
                    {nowInside && <NowLabel style={{ top: nowY }}>{clockText(now)}</NowLabel>}
                </Gutter>

                {rows.map(row => (
                    <Col
                        key={row.rowId}
                        role="group"
                        aria-labelledby={`col-${row.rowId}`}
                        style={{ height: total }}
                        $offset={-(((axis.opens % 60) / 60) * HOUR_PX)}
                        $drop={dropOverBayId === row.rowId}
                        {...dropProps(row.rowId)}
                    >
                        {nowY > 0 && <Past style={{ height: nowY }} />}
                        {nowInside && <NowLine style={{ top: nowY }} />}
                        {row.bars.map(bar => {
                            const b = box(bar);
                            if (bar.kind === 'active') {
                                return (
                                    <Block key={bar.id} style={{ top: b.top, left: b.left, width: b.width, zIndex: 3 }}>
                                        <ActiveWrap
                                            $minH={b.height - 4}
                                            onClick={e => { if (!(e.target as HTMLElement).closest('button')) onOpenBar(bar, row.rowId); }}
                                        >
                                            {renderActive(bar, row.rowId)}
                                        </ActiveWrap>
                                    </Block>
                                );
                            }
                            const curing = !!bar.curingUntil && new Date(bar.curingUntil) > now;
                            return (
                                <Block key={bar.id} style={b}>
                                    <Slab
                                        type="button"
                                        $kind={bar.kind}
                                        $conflict={bar.conflict}
                                        $short={b.height < 46}
                                        onClick={() => onOpenBar(bar, row.rowId)}
                                        title={`${bar.car.licensePlate}, ${bar.car.jobTitle}`}
                                    >
                                        <SlabTop>
                                            {curing && <Hourglass size={12} aria-hidden="true" />}
                                            <Plate $size="sm">{bar.car.licensePlate}</Plate>
                                            <span>{formatClockTime(bar.start)}–{formatClockTime(bar.end)}</span>
                                        </SlabTop>
                                        {b.height >= 46 && <span>{bar.car.jobTitle}</span>}
                                    </Slab>
                                </Block>
                            );
                        })}
                    </Col>
                ))}
            </Grid>
        </Frame>
    );
}
