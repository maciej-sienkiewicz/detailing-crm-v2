// src/modules/employees/components/worktime/CardDays.tsx
//
// Miesiąc z karty czasu pracy jako lista dni - na stronie karty. Przełożony ma zobaczyć
// to, co jest do sprawdzenia, bez liczenia: święta i urlop/L4 są podpisane (to nie są
// braki), brakujący dzień roboczy mówi „brak wpisu" bursztynem, weekend jest przygaszony,
// a notatka pracownika stoi pod dniem, którego dotyczy.
//
// Podpisy są zwykłym tekstem, nie plakietkami: plakietka wygląda na coś do kliknięcia,
// a tu nie ma czego klikać (uwaga właściciela: „badge, które są tylko informacyjne").
// Lista, a nie siatka kalendarza: na telefonie siedem kolumn po 40 px nie pomieści
// ani godzin, ani etykiety „L4", ani notatki.

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
                            {(day.holidayName || day.leave || day.missing) && (
                                <Labels>
                                    {day.holidayName && <Label $tone="holiday">{day.holidayName}</Label>}
                                    {day.leave && <Label $tone="leave">{day.leave.label}</Label>}
                                    {day.missing && <Label $tone="missing">brak wpisu</Label>}
                                </Labels>
                            )}
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
    min-height: 40px;
    padding: 7px 14px;
    border-bottom: 1px solid ${ui.lineFaint};
    font-size: 13.5px;
    color: ${ui.inkSoft};

    &:last-child { border-bottom: none; }

    ${p => (p.$kind === 'weekend' || p.$kind === 'holiday') && css`
        background: ${ui.surfaceSoft};
        color: ${ui.textFaint};
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

const Labels = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
`;

const LABEL_INK = {
    holiday: ui.textSecondary,
    leave: ui.brandDeep,
    missing: ui.warnInk,
} as const;

const Label = styled.span<{ $tone: keyof typeof LABEL_INK }>`
    font-size: 13px;
    font-weight: 600;
    color: ${p => LABEL_INK[p.$tone]};
    overflow-wrap: anywhere;
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
