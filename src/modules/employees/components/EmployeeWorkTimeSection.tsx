// src/modules/employees/components/EmployeeWorkTimeSection.tsx
//
// Zakładka „Czas pracy" w oknie pracownika: lista miesięcy, a wiersz otwiera to samo
// okno karty (WorkTimeCardModal), które otwiera wiersz w zakładce „Czas pracy" modułu.
// Decyzja o karcie wygląda i działa wszędzie tak samo. Karta stoi nad oknem pracownika.
//
// Bez stronicowania: okno przewija swoją treść, a miesięcy przybywa jeden na miesiąc.

import { useState } from 'react';
import styled from 'styled-components';
import { ChevronRight } from 'lucide-react';
import { Button, Notice, ui } from '@/common/components/ui';
import { useTeamWorkTimePeriods } from '../hooks/useWorkTime';
import { StatusText } from './worktime/StatusText';
import { hoursText } from './worktime/monthFormat';
import { WorkTimeCardModal } from './worktime/WorkTimeCardModal';

interface Props {
    userId: string;
}

export const EmployeeWorkTimeSection = ({ userId }: Props) => {
    const { periods, isLoading, isError, refetch } = useTeamWorkTimePeriods(userId);
    const [openPeriod, setOpenPeriod] = useState<string | null>(null);

    if (isError) {
        return (
            <Notice
                tone="danger"
                title="Nie udało się wczytać kart czasu pracy"
                action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
            />
        );
    }

    if (isLoading) return <Skeleton aria-busy="true" aria-label="Wczytuję karty"><span /><span /><span /></Skeleton>;

    if (periods.length === 0) {
        return (
            <Empty>
                <strong>Brak kart czasu pracy</strong>
                <span>Pracownik nie uzupełnił jeszcze żadnego miesiąca.</span>
            </Empty>
        );
    }

    return (
        <>
            <List>
                {periods.map(p => (
                    <li key={p.period}>
                        <PeriodRow type="button" onClick={() => setOpenPeriod(p.period)}>
                            <PeriodInfo>
                                <strong>{p.label}</strong>
                                <span>{p.entryCount} {p.entryCount === 1 ? 'dzień' : 'dni'}, {hoursText(p.totalMinutes)}</span>
                            </PeriodInfo>
                            <StatusText status={p.status} />
                            <Chevron aria-hidden="true" />
                        </PeriodRow>
                    </li>
                ))}
            </List>
            {openPeriod && (
                <WorkTimeCardModal period={openPeriod} userId={userId} onClose={() => setOpenPeriod(null)} />
            )}
        </>
    );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    overflow: hidden;

    li + li { border-top: 1px solid ${ui.lineSoft}; }
`;

const PeriodRow = styled.button`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 16px;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    border: 0;
    background: ${ui.surface};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
`;

const PeriodInfo = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const Chevron = styled(ChevronRight)`
    width: 16px;
    height: 16px;
    color: ${ui.textFaint};
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 36px 16px;
    text-align: center;

    strong { font-size: 15px; color: ${ui.ink}; }
    span { font-size: 14px; color: ${ui.textMuted}; }
`;

const Skeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    span { display: block; height: 52px; border-radius: 10px; background: ${ui.surfaceAlt}; }
`;
