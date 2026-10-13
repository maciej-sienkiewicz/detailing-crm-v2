// src/modules/employees/components/MonthGrid.tsx
//
// Siatka „osoby × dni miesiąca" - wspólna dla grafiku nieobecności (zakładka „Wnioski
// urlopowe") i wpisów godzin (zakładka „Czas pracy"). Dwie zakładki pokazują ten sam
// kształt, więc muszą wyglądać identycznie: te same kolumny dni, ten sam przygaszony
// weekend i święto, ta sama przyklejona kolumna z nazwiskiem. Różni się tylko komórka -
// każda sekcja dokłada do `DayCell` swoje wypełnienie.
//
// Przewija się sama siatka, a nie strona (także na telefonie), a nazwisko zostaje
// przyklejone do lewej krawędzi. Rachunek dni jest w monthGridDays.ts.

import styled, { css } from 'styled-components';
import { ui } from '@/common/components/ui';
import { isOffDay } from './monthGridDays';

const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

interface HeadProps {
    days: string[];
    holidays: Set<string>;
    today: string;
}

/** Wiersz nagłówka: „Osoba" i numer dnia z dniem tygodnia; dziś w kolorze marki. */
export function MonthGridHead({ days, holidays, today }: HeadProps) {
    return (
        <RowGroup role="row">
            <HeadCell role="columnheader" $sticky>Osoba</HeadCell>
            {days.map(d => (
                <HeadCell
                    key={d}
                    role="columnheader"
                    $off={isOffDay(d, holidays)}
                    $today={d === today}
                    title={holidays.has(d) ? 'Święto' : undefined}
                >
                    <b>{Number(d.slice(8))}</b>
                    <small>{WEEKDAYS[new Date(`${d}T00:00:00`).getDay()]}</small>
                </HeadCell>
            ))}
        </RowGroup>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

export const GridScroll = styled.div`
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

export const Grid = styled.div`
    display: grid;
    min-width: max-content;
`;

/** Wiersz tabeli dla czytnika ekranu, a dla siatki CSS - przezroczysty (komórki są jej dziećmi). */
export const RowGroup = styled.div`
    display: contents;
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

export const NameCell = styled.div`
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
    ${sticky}
`;

/** Komórka dnia bez treści: weekend i święto przygaszone. Sekcje dokładają wypełnienie. */
export const DayCell = styled.div<{ $off: boolean }>`
    min-height: 34px;
    border-bottom: 1px solid ${ui.lineFaint};
    border-left: 1px solid ${ui.lineFaint};
    background: ${p => p.$off ? ui.surfaceAlt : ui.surface};
`;

export const MonthLegend = styled.div`
    margin-left: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 12.5px;
    color: ${ui.textSecondary};

    span { display: inline-flex; align-items: center; gap: 6px; }
`;

export const GridEmpty = styled.p`
    margin: 0;
    padding: 16px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;
