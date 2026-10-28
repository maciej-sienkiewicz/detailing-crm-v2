// src/modules/employees/components/worktime/WorkTimeGrid.tsx
//
// „Wpisy godzin" pod listą kart: osoby z rolą liczącą czas pracy × dni miesiąca - ta
// sama siatka co grafik nieobecności na zakładce „Wnioski urlopowe" (MonthGrid).
// Odpowiada jednym rzutem oka na pytanie „kto uzupełnił godziny, a kto nie", na które
// lista nad nią odpowiada tylko liczbą („brak 3 dni") - bez wskazania, których.
//
// Komórka niesie jedną rzecz:
//   - godziny dnia na zieleni (wpisane),
//   - „U" albo „L4" na bursztynie, tym samym co nieobecność w grafiku urlopów - urlop
//     i L4 nie są brakiem, więc nie mogą wyglądać jak brak,
//   - pusta czerwień: dzień roboczy do dziś bez wpisu i bez urlopu (`missing` z API -
//     ta sama reguła, która liczy „brak N dni" w wierszu nad siatką).
// Dzień przyszły jest pusty: tam jeszcze nie ma czego brakować.
//
// Wiersz siatki nie otwiera karty: drogą do karty jest wiersz listy nad nią (uwaga
// właściciela o „wielu ścieżkach do tego samego okna", MonthView).

import { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { SectionTitle, ui } from '@/common/components/ui';
import type { MonthCardRow } from '../../api/worktimeMonthsApi';
import { getPolishHolidays } from '../../utils/polishHolidays';
import { todayIso } from '../../utils/leaveRequestFormat';
import { DayCell, Grid, GridScroll, MonthGridHead, MonthLegend, NameCell, RowGroup } from '../MonthGrid';
import { gridColumns, isOffDay, monthDays } from '../monthGridDays';
import { cellOf, type CellKind as Kind } from './gridCell';
import { periodInSentence } from './monthFormat';

interface Props {
    period: string;
    rows: MonthCardRow[];
}

export function WorkTimeGrid({ period, rows }: Props) {
    const days = useMemo(() => monthDays(period), [period]);
    const holidays = useMemo(() => getPolishHolidays(Number(period.slice(0, 4))), [period]);
    const today = todayIso();

    return (
        <Wrap aria-labelledby="worktime-grid-title">
            <Head>
                <SectionTitle id="worktime-grid-title">Wpisy godzin</SectionTitle>
                <MonthLegend>
                    <span><Swatch $kind="hours" aria-hidden="true">8</Swatch>wpisane godziny</span>
                    <span><Swatch $kind="missing" aria-hidden="true" />brak wpisu</span>
                    <span><Swatch $kind="leave" aria-hidden="true">U</Swatch>urlop</span>
                    <span><Swatch $kind="leave" aria-hidden="true">L4</Swatch>zwolnienie</span>
                    {rows.some(row => (row.leaveConflictDays ?? 0) > 0) && (
                        <span><Swatch $kind="conflict" aria-hidden="true">U</Swatch>godziny w dniu urlopu</span>
                    )}
                </MonthLegend>
            </Head>

            <GridScroll tabIndex={0} aria-label={`Wpisy godzin, ${periodInSentence(period)}`}>
                <Grid
                    role="table"
                    aria-label={`Wpisy godzin, ${periodInSentence(period)}`}
                    style={{ gridTemplateColumns: gridColumns(days.length) }}
                >
                    <MonthGridHead days={days} holidays={holidays} today={today} />
                    {rows.map(row => {
                        const byDate = new Map((row.days ?? []).map(d => [d.date, d]));
                        return (
                            <RowGroup key={row.userId} role="row">
                                <NameCell role="rowheader">{row.name}</NameCell>
                                {days.map(d => {
                                    const cell = cellOf(byDate.get(d));
                                    return (
                                        <Day
                                            key={d}
                                            role="cell"
                                            $off={isOffDay(d, holidays)}
                                            $kind={cell.kind}
                                            title={cell.description ?? undefined}
                                            aria-label={cell.description ? `${row.name}, ${d}: ${cell.description}` : undefined}
                                        >
                                            {cell.text}
                                        </Day>
                                    );
                                })}
                            </RowGroup>
                        );
                    })}
                </Grid>
            </GridScroll>
        </Wrap>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Wrap = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    /* Odstęp sekcji jak między kolejką wniosków a grafikiem nieobecności. */
    margin-top: 16px;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 8px 16px;
    flex-wrap: wrap;
`;

/*
 * Odcienie jak wszędzie (CLAUDE.md §2): zieleń = „domknięte", bursztyn = nieobecność
 * (ten sam #fde68a co w grafiku urlopów), czerwień = brak. To tła komórek tabeli,
 * a nie przyciski - wypełnienie akcji w oknie zostaje jedno.
 */
const kindStyle = (kind: Kind) => {
    if (kind === 'hours') return css`background: ${ui.okTintHover}; color: ${ui.okInk};`;
    if (kind === 'leave') return css`background: #fde68a; color: ${ui.warnInk};`;
    // Urlop z wpisanymi godzinami: odcień urlopu z czerwoną obwódką - dwa fakty, które się wykluczają.
    if (kind === 'conflict') return css`background: #fde68a; color: ${ui.dangerInk}; box-shadow: inset 0 0 0 2px ${ui.dangerInk};`;
    if (kind === 'missing') return css`background: #fee2e2; box-shadow: inset 0 0 0 1px ${ui.dangerLine};`;
    return css``;
};

const Day = styled(DayCell)<{ $kind: Kind }>`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    white-space: nowrap;
    ${p => kindStyle(p.$kind)}
`;

const Swatch = styled.span<{ $kind: Kind }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 0 2px;
    border-radius: 3px;
    font-size: 10.5px;
    font-weight: 700;
    ${p => kindStyle(p.$kind)}
`;
