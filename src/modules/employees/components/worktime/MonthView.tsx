// src/modules/employees/components/worktime/MonthView.tsx
//
// Zakładka „Czas pracy": kto ma kartę czasu pracy za miesiąc w jakim stanie
// (docs/api-worktime-months.md). Listy obecności mają własną zakładkę.
//
// Uproszczona po uwagach właściciela: „za dużo labelek, za dużo przycisków, wiele
// ścieżek, które prowadzą do tego samego modalu, badge tylko informacyjne". Teraz:
//   - jedno zdanie podsumowania („4 z 7 kart zatwierdzonych"),
//   - lista osób, w której wiersz jest JEDYNĄ drogą do karty - otwiera ją w oknie
//     (WorkTimeCardModal), z miesiącem przewijanym w środku okna.
// Status karty jest tekstem w kolorze, nie pastylką: nie da się w niego kliknąć, więc nie
// może wyglądać jak coś do kliknięcia.
//
// Miesiąc i otwarta karta są w adresie (`?period=2026-09&card={userId}`): tam linkuje push
// „karta złożona" i podpowiedź na Tablicy, a odświeżenie strony zostawia okno otwarte.

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { EmptyState } from '@/common/components/EmptyState';
import { Button, Card, IconButton, Notice, ui } from '@/common/components/ui';
import type { MonthCardRow } from '../../api/worktimeMonthsApi';
import { useMonthOverview } from '../../hooks/useWorktimeMonths';
import { StatusText } from './StatusText';
import { WorkTimeCardModal } from './WorkTimeCardModal';
import {
    addMonths, approvedSummary, defaultPeriod, hoursOfNorm, isPeriod, missingDaysText,
    monthOptions, periodLabel, periodOf,
} from './monthFormat';

const PERIOD_PARAM = 'period';
/** Otwarta karta: `?card={userId}` - z tym linkiem okno otwiera się po wejściu i po odświeżeniu. */
const CARD_PARAM = 'card';

interface Props {
    /** Przejście do zespołu - tam widać, której roli liczy się czas pracy. */
    onGoToTeam?: () => void;
}

export function MonthView({ onGoToTeam }: Props) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Miesiąc z adresu, o ile jest prawdziwy i nie z przyszłości - inaczej domyślny.
    const current = periodOf(new Date());
    const requested = searchParams.get(PERIOD_PARAM);
    const period = isPeriod(requested) && requested <= current ? requested : defaultPeriod();

    const month = useMonthOverview(period);
    const data = month.data?.period === period ? month.data : undefined;
    const rows = data?.employees ?? [];

    const openCard = searchParams.get(CARD_PARAM);
    const setCard = (userId: string | null) => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        if (userId) params.set(CARD_PARAM, userId);
        else params.delete(CARD_PARAM);
        return params;
    }, { replace: !userId });

    const setPeriod = (next: string) => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set(PERIOD_PARAM, next);
        // Karta należała do poprzedniego miesiąca.
        params.delete(CARD_PARAM);
        return params;
    });

    const options = useMemo(() => {
        const list = monthOptions();
        return list.includes(period) ? list : [...list, period];
    }, [period]);

    return (
        <Wrap>
            <MonthBar aria-label="Miesiąc">
                <IconButton label="Poprzedni miesiąc" onClick={() => setPeriod(addMonths(period, -1))}>
                    <ChevronLeft />
                </IconButton>
                <MonthSelect
                    aria-label="Wybierz miesiąc"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                >
                    {options.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
                </MonthSelect>
                <IconButton
                    label="Następny miesiąc"
                    disabled={period >= current}
                    onClick={() => setPeriod(addMonths(period, 1))}
                >
                    <ChevronRight />
                </IconButton>
            </MonthBar>

            {month.isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać miesiąca"
                    action={<Button variant="ghost" size="sm" onClick={() => month.refetch()}>Spróbuj ponownie</Button>}
                />
            ) : !data ? (
                <Card aria-busy="true" aria-label="Wczytuję miesiąc">
                    <Summary><SkeletonBar $w="200px" /></Summary>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonRow key={i}><SkeletonBar $w={`${40 + (i % 2) * 20}%`} /></SkeletonRow>
                    ))}
                </Card>
            ) : data.counts.total === 0 ? (
                <EmptyState
                    icon={<Users />}
                    title="W tym miesiącu nikt nie liczy czasu pracy"
                    description="Karty czasu pracy mają osoby, których rola ma włączony liczony czas pracy."
                >
                    {onGoToTeam && <EmptyAction><Button variant="outline" onClick={onGoToTeam}>Przejdź do zespołu</Button></EmptyAction>}
                </EmptyState>
            ) : (
                <Card>
                    <Summary as="h2">{approvedSummary(data.counts.approved, data.counts.total)}</Summary>
                    <Rows aria-label={`Karty czasu pracy, ${periodLabel(period)}`}>
                        {rows.map(row => <MonthRow key={row.userId} row={row} onOpen={() => setCard(row.userId)} />)}
                    </Rows>
                </Card>
            )}

            {openCard && (
                <WorkTimeCardModal key={`${period}/${openCard}`} period={period} userId={openCard} onClose={() => setCard(null)} />
            )}
        </Wrap>
    );
}

// ─── Wiersz osoby ───────────────────────────────────────────────────────────────

function MonthRow({ row, onOpen }: { row: MonthCardRow; onOpen: () => void }) {
    return (
        <li>
            <RowButton type="button" onClick={onOpen} data-testid="month-row">
                <Who>
                    <Name>{row.name}</Name>
                    <Hours>
                        {hoursOfNorm(row.totalMinutes, row.expectedMinutes)}
                        {row.missingWorkingDays > 0 && `, ${missingDaysText(row.missingWorkingDays)}`}
                    </Hours>
                </Who>
                <StatusText status={row.status} />
                <Chevron aria-hidden="true"><ChevronRight /></Chevron>
            </RowButton>
        </li>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const PHONE = '(max-width: 640px)';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const MonthBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MonthSelect = styled.select`
    height: 36px;
    min-width: 180px;
    padding: 0 34px 0 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
    appearance: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { height: 44px; flex: 1; }
`;

const Summary = styled.div`
    margin: 0;
    padding: 18px 24px 14px;
    font-size: 17px;
    font-weight: 700;
    color: ${ui.ink};
    border-bottom: 1px solid ${ui.lineFaint};

    @media ${PHONE} { padding: 16px 16px 12px; font-size: 16px; }
`;

const Rows = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;

    li { border-bottom: 1px solid ${ui.lineFaint}; }
    li:last-child { border-bottom: none; }
`;

const RowButton = styled.button`
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 16px;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 10px 24px;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: background 120ms ease;
    -webkit-tap-highlight-color: transparent;

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }

    @media ${PHONE} { padding: 10px 16px; gap: 10px; }
`;

const Who = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Name = styled.span`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Hours = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Chevron = styled.span`
    display: flex;
    color: ${ui.textFaint};
    svg { width: 16px; height: 16px; }
`;
/** Pobranie PDF jako link w zdaniu - to nie jest krok do zrobienia, tylko dostęp do pliku. */
const EmptyAction = styled.div`
    margin-top: 14px;
`;

const SkeletonRow = styled.div`
    padding: 20px 24px;
    border-top: 1px solid ${ui.lineFaint};
`;

const SkeletonBar = styled.span<{ $w: string }>`
    display: block;
    width: ${p => p.$w};
    height: 16px;
    border-radius: 6px;
    background: ${ui.surfaceAlt};
`;
