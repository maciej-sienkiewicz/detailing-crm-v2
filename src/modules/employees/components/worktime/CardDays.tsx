// src/modules/employees/components/worktime/CardDays.tsx
//
// Miesiąc z karty czasu pracy jako lista dni - w oknie przeglądu karty. Przełożony
// ma zobaczyć to, co jest do sprawdzenia, bez liczenia: święta i urlop/L4 są podpisane
// (to nie są braki), brakujący dzień roboczy jest bursztynowy, weekend przygaszony,
// a notatka pracownika stoi pod dniem, którego dotyczy.
//
// Lista, a nie siatka kalendarza: na telefonie siedem kolumn po 40 px nie pomieści
// ani godzin, ani etykiety „L4", ani notatki - a okno jest mobile-first.

import styled, { css } from 'styled-components';
import { ui } from '@/common/components/ui';
import type { CardDay } from '../../api/worktimeMonthsApi';
import { hoursText } from './monthFormat';

const WEEKDAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

const parse = (iso: string) => new Date(`${iso}T00:00:00`);
const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

type Kind = 'missing' | 'leave' | 'holiday' | 'weekend' | 'work';

function kindOf(day: CardDay): Kind {
    if (day.missing) return 'missing';
    if (day.leave) return 'leave';
    if (day.holidayName) return 'holiday';
    if (!day.isWorkingDay) return 'weekend';
    return 'work';
}

interface Props {
    days: CardDay[];
}

export function CardDays({ days }: Props) {
    return (
        <List aria-label="Dni miesiąca">
            {days.map(day => {
                const date = parse(day.date);
                const kind = kindOf(day);
                return (
                    <Row key={day.date} $kind={kind} data-kind={kind}>
                        <When>
                            <Weekday>{WEEKDAYS[date.getDay()]}</Weekday>
                            <Date_>{dayMonth(date)}</Date_>
                        </When>
                        <What>
                            <Tags>
                                {day.holidayName && <Tag $tone="holiday">{day.holidayName}</Tag>}
                                {day.leave && <Tag $tone="leave">{day.leave.label}</Tag>}
                                {day.missing && <Tag $tone="missing">brak wpisu</Tag>}
                            </Tags>
                            {day.note && <Note>{day.note}</Note>}
                        </What>
                        <Hours $empty={day.minutes === null}>
                            {day.minutes === null ? '-' : hoursText(day.minutes)}
                        </Hours>
                    </Row>
                );
            })}
        </List>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const List = styled.ol`
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    overflow: hidden;
`;

const Row = styled.li<{ $kind: Kind }>`
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 38px;
    padding: 6px 12px;
    border-bottom: 1px solid ${ui.lineFaint};
    font-size: 13.5px;
    color: ${ui.inkSoft};

    &:last-child { border-bottom: none; }

    ${p => p.$kind === 'weekend' && css`
        background: ${ui.surfaceSoft};
        color: ${ui.textFaint};
    `}
    ${p => p.$kind === 'holiday' && css`background: ${ui.surfaceSoft};`}
    /* Brak to jedyna rzecz w tej liście, którą trzeba przeczytać - dostaje bursztyn
       na całym wierszu, a nie tylko w etykiecie. */
    ${p => p.$kind === 'missing' && css`
        background: ${ui.warnTint};
        box-shadow: inset 3px 0 0 #f59e0b;
    `}
`;

const When = styled.span`
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-variant-numeric: tabular-nums;
`;

const Weekday = styled.span`
    width: 20px;
    font-size: 12px;
    font-weight: 700;
`;

const Date_ = styled.span`
    font-size: 13px;
`;

const What = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Tags = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;

    &:empty { display: none; }
`;

const TAG_TONES = {
    holiday: { bg: ui.surfaceAlt, ink: ui.textSecondary, line: ui.line },
    leave: { bg: ui.brandTint, ink: ui.brandDeep, line: ui.brandLineSoft },
    missing: { bg: '#fef3c7', ink: ui.warnInk, line: ui.warnLine },
} as const;

const Tag = styled.span<{ $tone: keyof typeof TAG_TONES }>`
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${p => TAG_TONES[p.$tone].line};
    background: ${p => TAG_TONES[p.$tone].bg};
    color: ${p => TAG_TONES[p.$tone].ink};
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Note = styled.span`
    font-size: 12.5px;
    line-height: 1.4;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const Hours = styled.span<{ $empty: boolean }>`
    font-size: 13.5px;
    font-weight: ${p => p.$empty ? 400 : 700};
    color: ${p => p.$empty ? ui.textFaint : ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;
