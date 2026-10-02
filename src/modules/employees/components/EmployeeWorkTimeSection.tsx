// src/modules/employees/components/EmployeeWorkTimeSection.tsx
//
// Karty czasu pracy na karcie pracownika: lista miesięcy, a wiersz otwiera to samo okno
// karty (WorkTimeCardModal), które otwiera wiersz w zakładce „Czas pracy". Decyzja
// o karcie wygląda i działa wszędzie tak samo.

import { useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useTeamWorkTimePeriods } from '../hooks/useWorkTime';
import { StatusText } from './worktime/StatusText';
import { hoursText } from './worktime/monthFormat';
import { WorkTimeCardModal } from './worktime/WorkTimeCardModal';

const PAGE_SIZE = 6;

interface Props {
    userId: string;
}

export const EmployeeWorkTimeSection = ({ userId }: Props) => {
    const { periods, isLoading } = useTeamWorkTimePeriods(userId);
    const [page, setPage] = useState(0);
    const [openPeriod, setOpenPeriod] = useState<string | null>(null);

    const totalPages = Math.ceil(periods.length / PAGE_SIZE);
    const pagePeriods = periods.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    return (
        <Wrap>
            <Card>
                <CardHeader>
                    <CardTitle>Karty czasu pracy</CardTitle>
                </CardHeader>

                {isLoading && <Spinner />}

                {!isLoading && periods.length === 0 && (
                    <EmptyState>
                        <EmptyTitle>Brak kart czasu pracy</EmptyTitle>
                        <EmptyDesc>Pracownik nie uzupełnił jeszcze żadnego miesiąca.</EmptyDesc>
                    </EmptyState>
                )}

                {!isLoading && pagePeriods.length > 0 && (
                    <ul>
                        {pagePeriods.map(p => (
                            <li key={p.period}>
                                <PeriodRow type="button" onClick={() => setOpenPeriod(p.period)}>
                                    <PeriodInfo>
                                        <PeriodLabel>{p.label}</PeriodLabel>
                                        <PeriodMeta>
                                            {p.entryCount} {p.entryCount === 1 ? 'dzień' : 'dni'}, {hoursText(p.totalMinutes)}
                                        </PeriodMeta>
                                    </PeriodInfo>
                                    <StatusText status={p.status} />
                                    <Chevron aria-hidden="true"><ChevronRight /></Chevron>
                                </PeriodRow>
                            </li>
                        ))}
                    </ul>
                )}

                {totalPages > 1 && (
                    <PaginationBar>
                        {/* Fakt i doprecyzowanie przecinkiem, bez kropki jako kleju (CLAUDE.md §4). */}
                        <PageInfo>Strona {page + 1} z {totalPages}, razem {periods.length} miesięcy</PageInfo>
                        <PageBtns>
                            <PageBtn onClick={() => setPage(n => n - 1)} disabled={page === 0} aria-label="Poprzednia strona">
                                <ChevronLeft />
                            </PageBtn>
                            <PageBtn onClick={() => setPage(n => n + 1)} disabled={page >= totalPages - 1} aria-label="Następna strona">
                                <ChevronRight />
                            </PageBtn>
                        </PageBtns>
                    </PaginationBar>
                )}
            </Card>
            {openPeriod && (
                <WorkTimeCardModal period={openPeriod} userId={userId} onClose={() => setOpenPeriod(null)} />
            )}
        </Wrap>
    );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 20px;
`;

/* Ta sama rama co historia urlopów obok (LeavesTab) - jedna kolumna, jeden język. */
const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    overflow: hidden;

    ul { margin: 0; padding: 0; list-style: none; }
    li { border-bottom: 1px solid ${st.bgCardAlt}; }
    li:last-child { border-bottom: none; }
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const PeriodRow = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 13px 20px;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover { background: #FAFBFD; }
    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
`;

const PeriodInfo = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PeriodLabel = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const PeriodMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Chevron = styled.span`
    display: flex;
    color: ${st.textMuted};
    svg { width: 16px; height: 16px; }
`;

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    border-top: 1px solid ${st.border};
`;

const PageInfo = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 500;
`;

const PageBtns = styled.div`
    display: flex;
    gap: 6px;
`;

const PageBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: none;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    svg { width: 14px; height: 14px; }

    &:hover:not(:disabled) { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; color: ${st.text}; }
    &:disabled { opacity: 0.35; cursor: default; }
`;

const Spinner = styled.div`
    width: 24px;
    height: 24px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 16px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 40px 24px;
    text-align: center;
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const EmptyDesc = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    max-width: 280px;
`;
